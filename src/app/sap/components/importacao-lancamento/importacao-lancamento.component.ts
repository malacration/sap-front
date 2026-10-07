import { Component, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../shared/service/alert.service';
import {
  HistoricoImportacao, ImportacaoLancamentoService, LancamentoGerado, LinhaLancamento,
  PreviaImportacaoLancamento, ResultadoImportacaoLancamento
} from '../../service/importacao-lancamento.service';

// Códigos fictícios de propósito: se a linha de exemplo ficar no arquivo, a validação recusa a conta
// em vez de gravar um lançamento falso.
export const MODELO_CSV = [
  'Filial;Livre;Data;Conta débito;Conta crédito;Valor;Histórico;Grupo econômico;Centro de custo;Referência 1;Referência 2;Referência 3',
  '1;;05/10/2026;CONTA_DEBITO;CONTA_CREDITO;1.234,56;EXEMPLO - apague esta linha;;;;;',
].join('\r\n');

@Component({
  selector: 'app-importacao-lancamento',
  templateUrl: './importacao-lancamento.component.html',
})
export class ImportacaoLancamentoComponent implements OnDestroy {
  aba: 'importar' | 'historico' = 'importar';
  arquivo: File = null;
  previa: PreviaImportacaoLancamento = null;
  resultado: ResultadoImportacaoLancamento = null;
  /** Lançamento gerado por número de linha do arquivo, depois da importação. */
  gerados = new Map<number, LancamentoGerado>();
  validando = false;
  importando = false;
  confirmando = false;
  carregandoHistorico = false;
  soProblemas = false;
  visao: 'linhas' | 'contas' = 'linhas';
  reimportar = false;
  // Depois de qualquer falha na importação não dá para saber, só pela tela, se o lote entrou.
  // Validar de novo responde: se entrou, a prévia mostra o arquivo como já importado.
  exigeNovaValidacao = false;
  pagina = 1;
  erro = '';
  historico: HistoricoImportacao[] = [];
  /** Importação do histórico com o detalhe dos lançamentos aberto. */
  historicoAberto: string = null;
  erroHistorico = '';
  private destruido = false;
  private moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  constructor(private service: ImportacaoLancamentoService, private alert: AlertService) {}
  ngOnDestroy(): void { this.destruido = true; }

  get ocupado(): boolean { return this.validando || this.importando || this.confirmando; }
  get jaImportado(): boolean { return !!this.previa?.importacoesAnteriores?.length; }
  get exigeConfirmacao(): boolean { return !!this.previa?.exigeConfirmacao; }
  get podeImportar(): boolean {
    return !!this.previa?.podeImportar && !this.resultado && !this.ocupado && !this.exigeNovaValidacao &&
      (!this.exigeConfirmacao || this.reimportar);
  }
  get totalDebito(): number { return (this.previa?.resumoPorConta || []).reduce((s, c) => s + c.debito, 0); }
  get totalCredito(): number { return (this.previa?.resumoPorConta || []).reduce((s, c) => s + c.credito, 0); }

  get linhasVisiveis(): LinhaLancamento[] {
    const linhas = this.previa?.linhas || [];
    return this.soProblemas ? linhas.filter(l => l.erros.length || l.avisos.length) : linhas;
  }

  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const escolhido = input.files?.[0];
    if (!escolhido) return;
    this.arquivo = escolhido;
    // Sem limpar, o navegador não dispara change ao escolher de novo o mesmo arquivo depois de
    // corrigi-lo no Excel, e a tela seguiria com o File antigo.
    input.value = '';
    this.limpar();
  }

  /** Saldo como na contabilidade: valor sem sinal + D (devedor) ou C (credor). */
  saldo(valor: number): string {
    const centavos = Math.round(valor * 100);
    const lado = centavos > 0 ? ' D' : centavos < 0 ? ' C' : '';
    return this.moeda.format(Math.abs(centavos) / 100) + lado;
  }

  mostrar(visao: 'linhas' | 'contas'): void {
    this.visao = visao;
    this.pagina = 1;
  }

  async validar(): Promise<void> {
    if (!this.arquivo || this.ocupado) return;
    this.limpar();
    this.validando = true;
    try {
      this.previa = await firstValueFrom(this.service.validar(this.arquivo));
      this.soProblemas = this.previa.linhasComErro > 0;
    } catch (e) {
      this.erro = this.mensagemErro(e, 'Não foi possível validar o arquivo.');
    } finally {
      this.validando = false;
    }
  }

  async importar(): Promise<void> {
    if (!this.podeImportar) return;
    const previa = this.previa;
    const arquivo = this.arquivo;
    this.confirmando = true;
    try {
      const resposta = await this.alert.confirm(
        `Importar ${previa.totalLinhas} lançamento(s) de ${arquivo.name}, total ${this.moeda.format(previa.totalValor)}? ` +
        'Todos entram juntos no SAP, ou nenhum entra.');
      if (!resposta.isConfirmed || this.destruido) return;
      this.importando = true;
      this.erro = '';
      this.resultado = await firstValueFrom(this.service.importar(arquivo, previa.hash, this.reimportar));
      this.gerados = new Map((this.resultado.porLinha || []).map(g => [g.linha, g]));
      // Mostra a tabela inteira: é nela que aparece o número gerado de cada linha.
      this.soProblemas = false;
      this.visao = 'linhas';
      this.pagina = 1;
    } catch (e) {
      this.exigeNovaValidacao = true;
      const corpo = (e as any)?.error;
      if (corpo?.previa) {
        this.previa = corpo.previa;
        this.soProblemas = true;
      }
      this.erro = this.erroDaImportacao(e);
    } finally {
      this.importando = false;
      this.confirmando = false;
    }
  }

  async abrirHistorico(): Promise<void> {
    this.aba = 'historico';
    if (this.carregandoHistorico) return;
    this.carregandoHistorico = true;
    this.erroHistorico = '';
    try {
      this.historico = await firstValueFrom(this.service.historico());
    } catch (e) {
      // Não confundir com "nenhuma importação": depois de um CONFERIR é aqui que o usuário confere.
      this.historico = [];
      this.erroHistorico = this.mensagemErro(e, 'Não foi possível carregar o histórico. Tente de novo.');
    } finally {
      this.carregandoHistorico = false;
    }
  }

  alternarDetalhe(h: HistoricoImportacao): void {
    this.historicoAberto = this.historicoAberto === h.id ? null : h.id;
  }

  /**
   * "nº 793886 a 793914": menor e maior número gerado (podem não ser seguidos; o detalhe é exato).
   * Se faltar o número de algum (histórico antigo guardava só a transação), a faixa é de transações:
   * misturar os dois daria uma faixa sem sentido.
   */
  faixaGerada(h: HistoricoImportacao): string {
    if (!h.lancamentos.length) return '';
    const porNumero = h.lancamentos.every(l => l.numero != null);
    const valores = h.lancamentos.map(l => porNumero ? l.numero : l.transacao);
    const menor = valores.reduce((a, b) => Math.min(a, b));
    const maior = valores.reduce((a, b) => Math.max(a, b));
    const rotulo = porNumero ? 'nº' : 'transação';
    return menor === maior ? `${rotulo} ${menor}` : `${rotulo} ${menor} a ${maior}`;
  }

  baixarModelo(): void {
    // BOM para o Excel abrir os acentos certos; o back aceita o arquivo com ou sem ele.
    const url = URL.createObjectURL(new Blob(['﻿' + MODELO_CSV], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-lancamentos.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private limpar(): void {
    this.previa = null;
    this.resultado = null;
    this.gerados = new Map();
    this.erro = '';
    this.reimportar = false;
    this.exigeNovaValidacao = false;
    this.soProblemas = false;
    this.pagina = 1;
  }

  /**
   * Sem resposta (status 0) ou erro do servidor (5xx) a importação pode ter entrado. Recusa com
   * resposta (4xx) é definitiva: o back recusa antes de enviar o lote, ou o SAP rejeitou o lote todo.
   */
  private erroDaImportacao(e: any): string {
    const status = e?.status ?? 0;
    if (status === 0 || status >= 500)
      return this.mensagemErro(e, 'Sem resposta do servidor. A importação pode ter entrado: valide o arquivo de novo ' +
        'antes de repetir (se ela entrou, o arquivo aparece como já importado).');
    return this.mensagemErro(e, `A importação foi recusada (HTTP ${status}). Nenhum lançamento foi gravado.`);
  }

  private mensagemErro(e: any, fallback: string): string {
    const corpo = e?.error;
    if (corpo?.mensagem) return corpo.mensagem;
    if (typeof corpo === 'string' && corpo.trim()) return corpo;
    return fallback;
  }
}
