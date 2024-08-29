import * as moment from "moment";
import { Action } from "../../../shared/components/action/action.model";
import { formatCurrency } from "@angular/common";

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

  get formattedDocDate() {
    return moment(this.DocDate).format('DD/MM/YYYY');
  }

  get totalCurrency() {
    return formatCurrency(this.DocTotal, 'pt', 'R$');
  }
}

export class DocumentLines {
  ItemCode: number;
  ItemDescription: string;
  U_preco_negociado: number;
  Quantity: number; 

  get quantityCurrency() {
    return formatCurrency(this.Quantity, 'pt', '');
  }

  get precoNegociadoCurrency() {
    return formatCurrency(this.U_preco_negociado, 'pt', 'R$');
  }

  get totalLinhaCurrency() {
    return formatCurrency(this.U_preco_negociado* this.Quantity, 'pt', 'R$');
  }
}
