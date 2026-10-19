import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { RelatorioService, INTERVALO_EXECUCAO_MS } from '../../../../sap/service/relatorio.service';
import { EXECUCAO_ATIVA, Execucao } from '../../modelos/execucao.model';
import { abrirAbaPendente, mostrarHtmlEmAba, salvarArquivo } from '../../html-em-aba';

/**
 * "Minhas execuções": os relatórios que o usuário pediu, em qualquer estado.
 *
 * A geração é assíncrona e o estado mora no servidor, então recarregar a página
 * não perde nada: este painel lista de novo, continua acompanhando o que está
 * na fila e, quando termina, entrega - PDF/CSV baixam sozinhos; HTML precisa de
 * um clique (abrir aba sem gesto do usuário é bloqueado como popup).
 *
 * Só entrega o que viu em andamento e que nenhuma tela está esperando: a tela
 * que pediu entrega o próprio resultado, e o que já terminou antes de a página
 * abrir fica marcado como "novo", sem baixar sozinho.
 */
@Component({
  selector: 'app-relatorio-execucoes',
  templateUrl: './relatorio-execucoes.component.html',
  styleUrls: ['./relatorio-execucoes.component.scss'],
})
export class RelatorioExecucoesComponent implements OnInit, OnDestroy {
  execucoes: Execucao[] = [];
  carregando = false;
  aberto = true;
  /** Ids com ação em curso (baixar, gerar de novo, remover). */
  ocupadas = new Set<string>();

  /** Ids vistos em andamento por este painel: só esses são entregues ao terminar. */
  private vistasAtivas = new Set<string>();
  private acompanhamento?: Subscription;
  private readonly destruir = new Subject<void>();

  constructor(private readonly service: RelatorioService, private readonly toastr: ToastrService) {}

  ngOnInit(): void {
    this.atualizar();
    this.service.execucaoIniciada$.pipe(takeUntil(this.destruir)).subscribe((execucao) => {
      this.aberto = true;
      this.vistasAtivas.add(execucao.id);
      this.execucoes = [execucao, ...this.execucoes.filter((e) => e.id !== execucao.id)];
      this.acompanhar();
    });
  }

  ngOnDestroy(): void {
    this.destruir.next();
    this.destruir.complete();
    this.acompanhamento?.unsubscribe();
  }

  get ativas(): number {
    return this.execucoes.filter((e) => this.ativa(e)).length;
  }

  ativa(execucao: Execucao): boolean {
    return EXECUCAO_ATIVA.includes(execucao.status);
  }

  /** Concluída e ainda não aberta/baixada neste navegador. */
  nova(execucao: Execucao): boolean {
    return execucao.status === 'CONCLUIDO' && !this.service.foiEntregue(execucao.id);
  }

  atualizar(): void {
    this.carregando = true;
    this.service.listarExecucoes().pipe(takeUntil(this.destruir)).subscribe({
      next: (execucoes) => {
        this.receber(execucoes);
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  abrir(execucao: Execucao): void {
    // A aba sai no clique; o conteudo chega depois.
    const aba = execucao.formato === 'html' ? abrirAbaPendente() : null;
    this.entregar(execucao, aba);
  }

  gerarNovamente(execucao: Execucao): void {
    this.ocupadas.add(execucao.id);
    const pedido = { params: execucao.params };
    const origem = execucao.tipo === 'PREVIEW'
      ? this.service.iniciarPreview(execucao.relatorioId, execucao.formato, pedido, execucao.versao)
      : this.service.iniciarRender(execucao.relatorioId, execucao.formato, pedido);
    origem.subscribe({
      next: () => {
        this.ocupadas.delete(execucao.id);
        this.toastr.info(`"${execucao.relatorioNome}" foi para a fila.`);
      },
      error: async (erro: HttpErrorResponse) => {
        this.ocupadas.delete(execucao.id);
        const detalhe = await this.service.lerErro(erro);
        this.toastr.error(detalhe?.mensagem || 'Não foi possível gerar o relatório novamente.');
      },
    });
  }

  remover(execucao: Execucao): void {
    this.ocupadas.add(execucao.id);
    this.service.removerExecucao(execucao.id).subscribe({
      next: () => {
        this.ocupadas.delete(execucao.id);
        this.execucoes = this.execucoes.filter((e) => e.id !== execucao.id);
      },
      error: async (erro: HttpErrorResponse) => {
        this.ocupadas.delete(execucao.id);
        const detalhe = await this.service.lerErro(erro);
        this.toastr.error(detalhe?.mensagem || 'Não foi possível remover.');
      },
    });
  }

  situacao(execucao: Execucao): { texto: string; classe: string } {
    switch (execucao.status) {
      case 'PENDENTE':
        return { texto: 'Na fila', classe: 'badge-secondary' };
      case 'EXECUTANDO':
        return { texto: 'Gerando…', classe: 'badge-info' };
      case 'CONCLUIDO':
        return { texto: 'Pronto', classe: 'badge-success' };
      case 'FALHOU':
        return { texto: 'Falhou', classe: 'badge-danger' };
      default:
        return { texto: 'Excluído', classe: 'badge-light' };
    }
  }

  identificar(_: number, execucao: Execucao): string {
    return execucao.id;
  }

  /** Recebe a lista do servidor e entrega o que acabou de terminar. */
  private receber(execucoes: Execucao[]): void {
    for (const execucao of execucoes) {
      if (this.ativa(execucao)) {
        this.vistasAtivas.add(execucao.id);
      } else if (this.vistasAtivas.delete(execucao.id)) {
        this.terminou(execucao);
      }
    }
    this.execucoes = execucoes;
    this.acompanhar();
  }

  private terminou(execucao: Execucao): void {
    // A tela que pediu esta esperando: ela entrega e avisa.
    if (this.service.estaSendoAcompanhada(execucao.id)) {
      return;
    }
    if (execucao.status === 'FALHOU') {
      this.toastr.error(execucao.erro?.mensagem || 'Falhou.', `"${execucao.relatorioNome}"`);
      return;
    }
    if (execucao.status !== 'CONCLUIDO' || this.service.foiEntregue(execucao.id)) {
      return;
    }
    if (execucao.formato === 'html') {
      this.toastr.success('Clique em "Abrir" em Minhas execuções.', `"${execucao.relatorioNome}" está pronto`);
      return;
    }
    this.entregar(execucao, null);
  }

  private entregar(execucao: Execucao, aba: Window | null): void {
    this.ocupadas.add(execucao.id);
    this.service.baixarExecucao(execucao.id).subscribe({
      next: (resposta) => {
        this.ocupadas.delete(execucao.id);
        if (aba) {
          mostrarHtmlEmAba(aba, resposta.body);
        } else {
          const nome = execucao.arquivo?.nome || `relatorio-${execucao.relatorioId}.${execucao.formato}`;
          salvarArquivo(resposta.body, this.service.nomeArquivo(resposta, nome));
          this.toastr.success(`"${execucao.relatorioNome}" baixado.`);
        }
      },
      error: async (erro: HttpErrorResponse) => {
        this.ocupadas.delete(execucao.id);
        aba?.close();
        const detalhe = await this.service.lerErro(erro);
        if (erro.status === 410) {
          // Retencao vencida entre a listagem e o clique.
          this.execucoes = this.execucoes.map((e) => (e.id === execucao.id ? { ...e, status: 'EXCLUIDO', arquivo: null } : e));
        }
        this.toastr.error(detalhe?.mensagem || 'Não foi possível abrir o relatório.');
      },
    });
  }

  /** Consulta a lista enquanto houver algo na fila; para quando tudo termina. */
  private acompanhar(): void {
    if (this.ativas === 0) {
      this.acompanhamento?.unsubscribe();
      this.acompanhamento = undefined;
      return;
    }
    if (this.acompanhamento) {
      return;
    }
    this.acompanhamento = timer(INTERVALO_EXECUCAO_MS, INTERVALO_EXECUCAO_MS).pipe(
      switchMap(() => this.service.listarExecucoes()),
      takeUntil(this.destruir),
    ).subscribe({
      next: (execucoes) => this.receber(execucoes),
      error: () => {
        // Falha de rede: solta e tenta de novo no proximo ciclo.
        this.acompanhamento = undefined;
        window.setTimeout(() => this.acompanhar(), INTERVALO_EXECUCAO_MS * 3);
      },
    });
  }
}
