import { Component, OnDestroy, OnInit } from '@angular/core';
import { EMPTY, ReplaySubject, Subject, Subscription, interval, lastValueFrom } from 'rxjs';
import { catchError, exhaustMap, filter, takeUntil } from 'rxjs/operators';
import { AgendaRelatorio, AgendaRelatorioService } from '../../service/agenda-relatorio.service';
import { AlertService } from '../../../shared/service/alert.service';

/**
 * Gestao do e-mail semanal de inadimplencia dos vendedores: liga/desliga, dias e hora do envio,
 * e-mails em copia e envio imediato. O envio roda no servidor em segundo plano; enquanto ele roda a
 * tela consulta o andamento de poucos em poucos segundos.
 */
@Component({
  selector: 'app-agenda-email',
  standalone: false,
  templateUrl: './agenda-email.component.html',
})
export class AgendaEmailComponent implements OnInit, OnDestroy {

  readonly dias = [
    { valor: 1, nome: 'Seg' }, { valor: 2, nome: 'Ter' }, { valor: 3, nome: 'Qua' },
    { valor: 4, nome: 'Qui' }, { valor: 5, nome: 'Sex' }, { valor: 6, nome: 'Sáb' }, { valor: 7, nome: 'Dom' },
  ];

  agenda: AgendaRelatorio = { ativo: true, dias: [1], hora: '07:00', copia: [] };
  /** um e-mail por linha, ou separados por virgula/ponto e virgula */
  copiaTexto = '';
  vendedor?: number;
  emailTeste = '';
  carregando = false;

  /** envio disparado por esta tela e ainda sem resposta do POST */
  enviando = false;

  /** so true depois do GET inicial: antes disso a copia gravada e desconhecida e o envio nao pode confirmar nada */
  carregada = false;

  // ReplaySubject: um takeUntil assinado depois do destroy (resposta tardia de PUT/POST) cancela na hora
  private destruido$ = new ReplaySubject<void>(1);
  private consultar$ = new Subject<void>();
  /** sobe a cada envio iniciado: resposta de uma consulta feita antes do envio nao vale (ainda diria "parado") */
  private geracao = 0;
  private polling?: Subscription;

  constructor(private service: AgendaRelatorioService, private alert: AlertService) {}

  ngOnInit(): void {
    // uma consulta de andamento por vez, do polling ou do botao Atualizar: resposta velha nao sobrescreve a nova
    this.consultar$.pipe(
      exhaustMap(() => {
        const g = this.geracao;
        return this.service.get().pipe(
          catchError(() => { if (g === this.geracao) { this.parar(); } return EMPTY; }),
          filter(() => g === this.geracao),
        );
      }),
      takeUntil(this.destruido$),
    ).subscribe(a => this.aplicarStatus(a));
    this.carregar();
  }

  ngOnDestroy(): void {
    this.destruido$.next();
    this.destruido$.complete();
  }

  carregar(): void {
    this.carregando = true;
    this.service.get().pipe(takeUntil(this.destruido$)).subscribe({
      next: a => { this.aplicar(a); this.carregando = false; this.carregada = true; },
      error: () => { this.carregando = false; },
    });
  }

  /** Atualiza so o andamento do envio, sem mexer no que o admin esta digitando. */
  atualizarStatus(): void {
    this.consultar$.next();
  }

  private aplicar(a: AgendaRelatorio): void {
    this.agenda = a;
    this.copiaTexto = (a.copia || []).join(', ');
    this.seguirSeEnviando();
  }

  private aplicarStatus(a: AgendaRelatorio): void {
    this.agenda.ultimoEnvio = a.ultimoEnvio;
    this.agenda.ultimoStatus = a.ultimoStatus;
    this.agenda.emAndamento = a.emAndamento;
    this.seguirSeEnviando();
  }

  private seguirSeEnviando(): void {
    if (this.agenda.emAndamento) { this.acompanhar(); } else { this.parar(); }
  }

  /** Se a API falhar o polling para (o ErrorInterceptor ja avisou) e o botao Atualizar retoma. */
  private acompanhar(): void {
    if (this.polling) { return; }
    this.polling = interval(5000).pipe(takeUntil(this.destruido$)).subscribe(() => this.consultar$.next());
  }

  private parar(): void {
    this.polling?.unsubscribe();
    this.polling = undefined;
  }

  temDia(valor: number): boolean {
    return this.agenda.dias.includes(valor);
  }

  alternarDia(valor: number): void {
    this.agenda.dias = this.temDia(valor)
      ? this.agenda.dias.filter(d => d !== valor)
      : [...this.agenda.dias, valor].sort();
  }

  private copiaDaTela(): string[] {
    const vistos = new Set<string>();
    return this.copiaTexto.split(/[\n,;]+/).map(e => e.trim()).filter(e => e)
      .filter(e => { const k = e.toLowerCase(); return vistos.has(k) ? false : (vistos.add(k), true); });
  }

  async salvar(): Promise<void> {
    if (!this.agenda.dias.length) {
      this.alert.error('Escolha ao menos um dia da semana.');
      return;
    }
    if (!this.agenda.hora) {
      this.alert.error('Informe a hora do envio.');
      return;
    }
    if (this.agenda.hora > '23:00') {
      this.alert.error('Use uma hora até 23:00: a janela de envio não passa da meia-noite.');
      return;
    }
    try {
      const salva = await this.alert.loading(this.service.salvar({ ...this.agenda, copia: this.copiaDaTela() }));
      this.aplicar(salva);
    } catch { /* o ErrorInterceptor global ja mostra o erro */ }
  }

  async enviarAgora(): Promise<void> {
    if (!this.carregada || this.enviando || this.agenda.emAndamento) { return; }
    const teste = this.emailTeste.trim();
    if (teste && !this.vendedor) {
      this.alert.error('Informe o código do vendedor para o envio de teste.');
      return;
    }
    // o servidor envia com a copia gravada: o que esta na tela e nao foi salvo nao valeria (teste nao leva copia)
    if (!teste && this.copiaDaTela().join('\n') !== (this.agenda.copia || []).join('\n')) {
      this.alert.error('A lista de cópia foi alterada. Salve antes de enviar.');
      return;
    }
    const alvo = this.vendedor ? `ao vendedor ${this.vendedor}` : 'a todos os vendedores marcados para receber o relatório';
    const copia = this.agenda.copia?.length ? ` Cópia para: ${this.agenda.copia.join(', ')}.` : '';
    const res = await this.alert.confirm(teste
      ? `Enviar um TESTE do relatório do vendedor ${this.vendedor} somente para ${teste}? Nenhum vendedor nem cópia recebe.`
      : `Enviar o relatório agora ${alvo}?${copia}`);
    if (!res.isConfirmed) { return; }
    this.enviando = true;
    try {
      const resp = await lastValueFrom(this.service.enviar(this.vendedor, teste));
      if (resp.status === 202) { this.geracao++; this.agenda.emAndamento = true; this.acompanhar(); }
    } catch (e: any) {
      if (e?.status === 409) {
        this.alert.error('Já existe um envio em andamento. Aguarde terminar.');
        this.atualizarStatus();
      }
    } finally {
      this.enviando = false;
    }
  }
}
