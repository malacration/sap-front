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

  @ViewChild('modalRef', { static: true })
  modal: ModalComponent;

  titulos: CobrancaTitulo[] = [];
  historico: CobrancaHistorico[] = [];
  carregandoHistorico = false;
  salvando = false;
  somenteHistorico = false;

  form = this.formVazio();

  constructor(private service: CobrancaService, private alertService: AlertService) {
  }

  abrir(titulos: CobrancaTitulo[]): void {
    this.somenteHistorico = false;
    this.titulos = titulos;
    this.form = this.formVazio();
    this.historico = [];
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
      complete: () => {
        this.carregandoHistorico = false;
      }
    });
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
