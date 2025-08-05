import * as moment from "moment";
import { Action, ActionReturn } from "../../../shared/components/action/action.model";
import { formatCurrency } from "@angular/common";
import { DocumentTypes } from "../labels/document-types";
import { StatusTypes } from "../labels/status-types";

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

  get formattedDocDate() {
    return moment(this.DocDate).format('DD/MM/YYYY');
  }

  get totalCurrency() {
    return formatCurrency(this.DocTotal, 'pt', 'R$');
  }
}

export class DocumentLines {
  ItemCode: number;
  DocObjectCode: string
  ItemDescription: string;
  U_preco_negociado: number;
  Quantity: number; 
  DocDate: string;
  DocumentStatus : string

  get labelDocumentType(){
    return DocumentTypes[this.DocObjectCode as keyof typeof DocumentTypes];
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

  get totalLinhaCurrency() {
    return formatCurrency(this.U_preco_negociado* this.Quantity, 'pt', 'R$');
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

  getActions(): Action[] {
    if(this.isVenda() && this.DocumentStatus == "bost_Close")
      return [ 
        new Action("Devolver", new ActionReturn("devolver", this), "far fa-times-circle", "danger")
      ]
    else
      return []
  }
}
