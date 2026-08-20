import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { AlertService } from '../../../shared/service/alert.service';
import { CobrancaTitulo } from '../../../sap/model/cobranca/cobranca-titulo';
import { CobrancaHistorico } from '../../../sap/model/cobranca/cobranca-historico';
import { CobrancaDominio } from '../../../sap/model/cobranca/cobranca-dominio';
import { CobrancaAcaoLoteItem, CobrancaAcaoPayload, CobrancaService } from '../../../sap/service/cobranca/cobranca.service';

export interface CobrancaDominios {
  status: CobrancaDominio[];
  acao: CobrancaDominio[];
  situacao: CobrancaDominio[];
  ocorrencia: CobrancaDominio[];
}

@Component({
  selector: 'app-registrar-acao-modal',
  templateUrl: './registrar-acao-modal.component.html'
})
export class RegistrarAcaoModalComponent {

  @Input()
  dominios: CobrancaDominios = { status: [], acao: [], situacao: [], ocorrencia: [] };

  @Input()
  nomeUsuario = '';

  @Output()
  salvo = new EventEmitter<void>();

  // Saída própria: onSalvo() na tela limpa a seleção de lote (certo depois de registrar ação,
  // errado depois de apagar uma anotação - o cobrador perderia as 12 parcelas que marcou).
  @Output()
  removido = new EventEmitter<void>();

  @ViewChild('modalRef', { static: true })
  modal: ModalComponent;

  titulos: CobrancaTitulo[] = [];
  historico: CobrancaHistorico[] = [];
  carregandoHistorico = false;
  salvando = false;
  somenteHistorico = false;
  // LineId em remoção: segura o botão da linha clicada sem travar as outras.
  removendo: number | null = null;

  form = this.formVazio();

  constructor(private service: CobrancaService, private alertService: AlertService) {
  }

  abrir(titulos: CobrancaTitulo[]): void {
    this.somenteHistorico = false;
    this.titulos = titulos;
    this.form = this.formVazio();
    this.historico = [];
    this.zeraEstadoDeEnvio();
    if (this.isUnico()) {
      this.carregarHistorico();
    }
    this.modal.openModal();
  }

  abrirHistorico(titulo: CobrancaTitulo): void {
    this.somenteHistorico = true;
    this.titulos = [titulo];
    this.form = this.formVazio();
    this.historico = [];
    this.zeraEstadoDeEnvio();
    this.carregarHistorico();
    this.modal.openModal();
  }

  isUnico(): boolean {
    return this.titulos.length === 1;
  }

  get historicoExibido(): CobrancaHistorico[] {
    return this.somenteHistorico ? this.historico : this.historico.slice(0, 1);
  }

  get tituloModal(): string {
    if (this.somenteHistorico) {
      return `Histórico - ${this.tituloIdentificado}`;
    }
    if (this.isUnico()) {
      return `Registrar cobrança - ${this.tituloIdentificado}`;
    }
    return `Aplicar em lote (${this.titulos.length} parcelas)`;
  }

  private get tituloIdentificado(): string {
    const titulo = this.titulos[0];
    if (!titulo) {
      return '';
    }
    return [titulo.identificacao, titulo.CardName].filter((parte) => !!parte).join(' - ');
  }

  // A regra de autoria mora no backend (U_UsuarioId); aqui é só não oferecer um botão que vai
  // falhar com 403. LineId != null e não !!LineId: o campo é numérico e nullable no backend, e
  // um id 0 desabilitaria o botão em silêncio.
  podeRemover(historico: CobrancaHistorico): boolean {
    return historico.LineId != null && historico.PodeRemover;
  }

  // Uma remoção por vez: os botões compartilham o estado de envio, e duas respostas concorrentes
  // repintariam a lista na ordem em que voltassem.
  get removendoAlguma(): boolean {
    return this.removendo != null;
  }

  remover(historico: CobrancaHistorico): void {
    const titulo = this.titulos[0];
    // removendoAlguma checado aqui e de novo depois da confirmação: entre o clique e a resposta do
    // usuário nada está marcado ainda, então o [disabled] do botão não protege esse intervalo.
    if (!titulo || !this.podeRemover(historico) || this.removendoAlguma) {
      return;
    }

    this.alertService
      .confirm(`Remover esta ação de ${historico.dataFormatada} do histórico? Não tem como desfazer.`)
      .then((resultado) => {
        if (!resultado.isConfirmed || this.removendoAlguma) {
          return;
        }
        this.removendo = historico.LineId;
        const aberturaNaSaida = this.abertura;
        this.service.removerHistorico(titulo.Tipo, titulo.DocEntry, titulo.InstlmntID, historico.LineId).subscribe({
          next: (restante) => {
            if (this.abertura === aberturaNaSaida) {
              this.removendo = null;
              this.historico = restante;
            }
            // A linha saiu do SAP mesmo se o modal já foi fechado, e o cabeçalho do registro
            // acompanha ela: a grade atrás precisa recarregar de qualquer jeito.
            this.removido.emit();
          },
          error: () => {
            if (this.abertura === aberturaNaSaida) {
              this.removendo = null;
            }
          }
        });
      });
  }

  podeSalvar(): boolean {
    return !!(this.form.observacao?.trim() || this.form.ocorrencia);
  }

  salvar(): void {
    if (!this.podeSalvar()) {
      this.alertService.error('Informe uma observação ou selecione uma ocorrência do que foi feito.');
      return;
    }

    this.salvando = true;
    const payload: CobrancaAcaoPayload = {
      status: this.form.status || null,
      acao: this.form.acao || null,
      situacao: this.form.situacao || null,
      ocorrencia: this.form.ocorrencia || null,
      observacao: this.form.observacao?.trim() || null,
      dataPromessa: this.form.dataPromessa || null,
    };

    const acao$ = this.isUnico()
      ? this.service.registrarAcao(this.titulos[0].Tipo, this.titulos[0].DocEntry, this.titulos[0].InstlmntID, payload)
      : this.service.registrarAcaoEmLote(this.montarItensLote(payload));

    acao$.subscribe({
      next: () => {
        this.salvando = false;
        this.modal.closeModal();
        this.salvo.emit();
      },
      error: () => {
        this.salvando = false;
      }
    });
  }

  cancelar(): void {
    this.modal.closeModal();
  }

  private montarItensLote(payload: CobrancaAcaoPayload): CobrancaAcaoLoteItem[] {
    return this.titulos.map((titulo) => ({
      tipo: titulo.Tipo,
      docEntry: titulo.DocEntry,
      instlmntId: titulo.InstlmntID,
      ...payload,
    }));
  }

  private carregarHistorico(): void {
    const titulo = this.titulos[0];
    this.carregandoHistorico = true;
    this.service.historico(titulo.Tipo, titulo.DocEntry, titulo.InstlmntID).subscribe({
      next: (historico) => {
        this.historico = historico;
        this.carregandoHistorico = false;
      },
      // Observable com erro não emite complete: sem isso o modal fica em "Carregando..." pra
      // sempre quando o histórico falha. O erro em si o interceptor global já notifica.
      error: () => {
        this.carregandoHistorico = false;
      },
      complete: () => {
        this.carregandoHistorico = false;
      }
    });
  }

  /**
   * Cada abertura ganha um número. Resposta de remoção que chega depois de fechar (ESC, backdrop
   * ou o × do modal, que não passam por aqui) é descartada pelo número - comparar só o código do
   * título não distinguia duas aberturas da MESMA parcela, e o histórico recém-carregado era
   * repintado com a foto antiga.
   */
  private abertura = 0;

  private zeraEstadoDeEnvio(): void {
    this.abertura++;
    this.removendo = null;
    this.salvando = false;
    this.carregandoHistorico = false;
  }

  private formVazio() {
    return {
      status: '',
      acao: '',
      situacao: '',
      ocorrencia: '',
      observacao: '',
      dataPromessa: '',
    };
  }
}
