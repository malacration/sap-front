import { formatCurrency } from '@angular/common';
import * as moment from 'moment';

export class PedidoVenda {
  DocEntry: number
  CardName: string
  CardCode: string
  DocNum: number
  DocDate: string
  DocTotal: number
  ItemCode
  DocumentLines : Array<LinhasPedido>
  TaxExtension : TaxExtension
  BPL_IDAssignedToInvoice : string
  DocDueDate : string = '2024-08-05'
  shipToCode : string
  PaymentMethod : string
  PaymentGroupCode : string
  Comments : string
  Frete : number
  VehicleState: string
  DistribSum: number
  Telephone : string
  Mobil : string
  DflWhs : string
  U_Localidade : number
  Name : string
  Dscription : string
  Quantity : number
  Weight1 : number
  OnHand : number
  IsCommited : number
  OnOrder : number
  UnitPrice : number
  PrecoNegociado : number
  PrecoBase : number
  Comentario : string
  FretePorLinha : number
  WarehouseCode : string
  Usage : number
  TaxCode : string
  CostingCode : string
  CostingCode2 : string
  BaseType : number
  BaseEntry : number
  BaseLine : number
  quantidadeEmCarregamento?: number
  UomCode : string
  ClosingRemarks : string
  AttachmentEntry : number
  Address2 : string
  SlpName : string
  SalesEmployeeName : string
  SalesPersonCode : number
  DocumentStatus : string

  get totalCurrency() {
    return formatCurrency(this.DocTotal, 'pt', 'R$');
  }

  get dataCriacao() {
    return moment(this.DocDate).format('DD/MM/YYYY');
  }

  get dataEntrega() {
    return this.DocDueDate ? moment(this.DocDueDate).format('DD/MM/YYYY') : '-';
  }

  get vendedor() {
    return this.SalesEmployeeName || this.SlpName || (this.SalesPersonCode != null ? this.SalesPersonCode : '-');
  }

  get statusLabel() {
    const status = String(this.DocumentStatus || '');
    if (status.includes('Open')) return 'Aberto';
    if (status.includes('Close')) return 'Fechado';
    if (status.includes('Paid')) return 'Pago';
    if (status.includes('Delivered')) return 'Entregue';
    return status || '-';
  }
}

export class LinhasPedido {
  ItemCode
  Quantity
  PriceList
  Usage
  U_preco_negociado
  UnitPrice
  ItemDescription
  MeasureUnit
  SalUnitMsr
  DflWhs
  DiscountPercent

  get precoUnitarioCurrency() {
    return formatCurrency(Number(this.U_preco_negociado ?? this.UnitPrice ?? 0), 'pt', 'R$');
  }

  get lineTotalCurrency() {
    const quantidade = Number(this.Quantity ?? 0);
    const preco = Number(this.U_preco_negociado ?? this.UnitPrice ?? 0);
    return formatCurrency(quantidade * preco, 'pt', 'R$');
  }
}

export class TaxExtension {
  Incoterms: number
  VehicleState: string
}
