import * as moment from "moment";
import { Action, ActionReturn } from "../../../shared/components/action/action.model";
import { formatCurrency } from "@angular/common";
import { DocumentTypes } from "../labels/document-types";
import { StatusTypes } from "../labels/status-types";
import { RouteLink } from "../route-link";

export class FutureDeliverySales {

  getActions(): Action[] {
    return [];
  }

  DocEntry: number;
  DocNum: number;
  SequenceSerial: number;
  DocDate: string;
  DocTotal: number;
  DocumentLines: DocumentLines[];
  DocObjectCode : string
  U_vf_estornada: number = 0;

  get formattedDocDate() {
    return moment(this.DocDate).format('DD/MM/YYYY');
  }

  get totalCurrency() {
    return formatCurrency(this.DocTotal, 'pt', 'R$');
  }
}

//tela interna que abre cada tipo de documento das abas de Pedidos e Entregas (mesmas rotas
//do TIPO_ROTA do mapa de relacoes). Tipo fora do mapa fica sem link, so o DocNum cru.
const ROTA_POR_TIPO_DOCUMENTO: { [docObjectCode: string]: string } = {
  oQuotations: '/venda/cotacao',
  oOrders: '/venda/pedidos-venda',
  oInvoices: '/financeiro/notas-fiscais',
  oCreditNotes: '/financeiro/devolucoes',
};

export class DocumentLines {
  DocEntry: number;
  DocNum: number;
  ItemCode: number;
  DocObjectCode: string
  ItemDescription: string;
  U_preco_negociado: number;
  Quantity: number;
  LineTotal: number;
  LineTotalDesonerado: number;
  DocDate: string;
  DocumentStatus : string
  U_vf_estornada: number = 0;

  get labelDocumentType(){
    return DocumentTypes[this.DocObjectCode as keyof typeof DocumentTypes];
  }

  get documentRouterLink(): RouteLink | number {
    const rota = ROTA_POR_TIPO_DOCUMENTO[this.DocObjectCode];
    if (!rota)
      return this.DocNum;

    return new RouteLink(
      this.DocNum?.toString(),
      rota,
      { id: this.DocEntry }
    );
  }

  get documentStatus(){
    return StatusTypes[this.DocumentStatus as keyof typeof StatusTypes];
  }

  get quantityCurrency() {
    return formatCurrency(this.Quantity, 'pt', '');
  }

  get precoNegociadoCurrency() {
    return formatCurrency(this.U_preco_negociado, 'pt', 'R$');
  }

  // O desonerado so vem calculado do backend nos endpoints de venda futura; sem ele o liquido
  // da linha e o proprio LineTotal. O fallback e obrigatorio porque formatCurrency de
  // undefined/null renderiza "R$ ∞" (o simbolo de infinito do locale).
  get totalLinhaCurrency() {
    const total = this.LineTotalDesonerado ?? this.LineTotal;
    return total == null ? '-' : formatCurrency(total, 'pt', 'R$');
  }

  get formattedDocDate() {
    return moment(this.DocDate).format('DD/MM/YYYY');
  }

  isVenda() : boolean{
    return  this.DocObjectCode == "oInvoices"
  }

  get formattedQuantityInvoice() {
    return this.isVenda() ? this.Quantity : this.Quantity * -1;
  }

  get estornada(): boolean {
    return Number(this.U_vf_estornada) === 1;
  }

  getActions(): Action[] {
    if(this.isVenda() && this.DocumentStatus == "bost_Close" && !this.estornada)
      return [
        new Action("Cancelar Conciliação", new ActionReturn("devolver", this), "far fa-times-circle", "danger")
      ]
    else
      return []
  }
}
