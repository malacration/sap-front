import { Component, Input, ViewChild } from '@angular/core';
import { PixGeradoItem, PixPedidoRequest, PixService } from '../../../sap/service/pix.service';
import { ModalComponent } from '../modal/modal.component';
import { DocumentList } from '../../../sap/model/markting/document-list';
import { Branch } from '../../../sap/model/branch';

type Etapa = 'selecao' | 'loading' | 'resultado' | 'erro';
type TipoPagamento = 'total' | 'parcial';

@Component({
  selector: 'app-gerar-pix',
  templateUrl: './gerar-pix.component.html',
})
export class GerarPixComponent {
  @Input() pedido?: DocumentList;

  @ViewChild('modal') modal: ModalComponent;

  etapa: Etapa = 'selecao';
  tipoPagamento: TipoPagamento = 'total';
  valorParcial: number | null = null;
  valorStandalone: number | null = null;
  filialSelecionada: Branch | null = null;
  parceiroCodigo: string | null = null;
  parceiroNome: string | null = null;
  pixData: PixGeradoItem | null = null;
  copiado = false;

  constructor(private pixService: PixService) {}

  get modoPedido(): boolean {
    return !!this.pedido;
  }

  openModal() {
    this.etapa = 'selecao';
    this.tipoPagamento = 'total';
    this.valorParcial = this.pedido?.DocTotal ?? null;
    this.valorStandalone = null;
    this.filialSelecionada = null;
    this.parceiroCodigo = null;
    this.parceiroNome = null;
    this.pixData = null;
    this.copiado = false;
    this.modal.openModal();
  }

  selecionarTipo(tipo: TipoPagamento) {
    this.tipoPagamento = tipo;
    this.valorParcial = tipo === 'parcial' ? this.pedido.DocTotal : null;
  }

  onFilialChange(branch: Branch) {
    this.filialSelecionada = branch;
  }

  onParceiroChange(parceiro: any) {
    this.parceiroCodigo = parceiro?.CardCode ?? null;
    this.parceiroNome = parceiro?.CardName ?? null;
  }

  gerar() {
    const request: PixPedidoRequest = {
      cardCode: this.modoPedido ? this.pedido.CardCode : this.parceiroCodigo,
      valor: this.resolverValor(),
      idFilial: this.modoPedido ? null : Number(this.filialSelecionada.Bplid),
    };

    if (this.modoPedido && this.pedido.DocEntry != null) {
      request.docEntry = this.pedido.DocEntry;
    }

    this.etapa = 'loading';
    this.copiado = false;

    console.log('[GerarPix] payload →', JSON.stringify(request, null, 2));

    this.pixService.gerarPixPedido(request).subscribe({
      next: (res) => { this.pixData = res; this.etapa = 'resultado'; },
      error: () => { this.etapa = 'erro'; },
    });
  }

  private resolverValor(): number {
    if (this.modoPedido) {
      return this.tipoPagamento === 'total' ? this.pedido.DocTotal : this.valorParcial;
    }
    return this.valorStandalone;
  }

  copiar() {
    if (this.pixData?.U_QrCodePix) {
      navigator.clipboard.writeText(this.pixData.U_QrCodePix);
      this.copiado = true;
    }
  }

  voltar() {
    this.etapa = 'selecao';
    this.pixData = null;
  }

  get gerarDesabilitado(): boolean {
    if (this.modoPedido) {
      return this.tipoPagamento === 'parcial' &&
        (this.valorParcial == null || this.valorParcial <= 0 || this.valorParcial > this.pedido.DocTotal);
    }
    return !this.parceiroCodigo ||
      this.valorStandalone == null || this.valorStandalone <= 0 ||
      this.filialSelecionada == null;
  }
}
