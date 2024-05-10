import { Component, OnInit, ViewChild } from '@angular/core';
import { BusinessPartnerDefinition } from '../../model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { Option } from '../../model/form/option';
import { RadioItem } from '../form/radio/radio.model';
import { Item } from '../../model/item';
import { OrderSalesService } from '../../service/order-sales.service';
import { AlertSerice } from '../../service/alert.service';

@Component({
  selector: 'app-document-statement',
  templateUrl: './document.statement.component.html',
  styleUrls: ['./document.statement.component.scss'],
})
export class DocumentStatementComponent implements OnInit {

  branchId = undefined
  tipoEnvio
  businesPartner
  formaPagamento
  condicaoPagamento
  observacao
  itens : Array<Item>
  tipoOperacao
  dtEntrega

  tipoEnvioRadio : Array<RadioItem> = [new RadioItem("Retirada","ret"), new RadioItem("Entrega","ent")]
  tipoOperacaoOptions: Array<Option> = [new Option(9,"venda"), new Option(16,"venda com entrega futura")]

  constructor(private businesPartnerService : BusinessPartnerService,
    private orderService : OrderSalesService,
    private alertService : AlertSerice){
  }
  
  ngOnInit(): void {
    
  }

  changePageBusinesPartner(){
    alert("change page Bp")
  }
  
  changeFormaPagamento($event){
    this.formaPagamento = $event
  }

  changeCondicaoPagamento($event){
    this.condicaoPagamento = $event
    this.itens.filter(it => it.PriceList == '11')
  }

  changeItens($event){
    this.itens = $event
  }

  changeTipoOperacao($event){
    this.tipoOperacao = $event
  }

  tabelas(){
    return Object.keys(this.itens.reduce((result:any, currentValue:any) => { 
      (result[currentValue['PriceList']] = result[currentValue['PriceList']] || []).push(currentValue);
      return result;
    }, {}));
  }

  itensBy(priceList){
    return this.itens.filter(it => it.PriceList == priceList)
  }

  isMutiplasTabelas(){
    if(this.itens){
      console.log(this.tabelas())
      return this.tabelas().length > 1
    }
    return false
  }

  selectBranch($event){
    this.branchId = $event
  }

  selectBp($event){
    this.businesPartner = $event
    this.businesPartnerService.get(this.businesPartner.CardCode).subscribe(it =>{
        this.businesPartner = it
        console.log(it)
    })
  }

  tipoEnvioChange($event){
    if($event instanceof RadioItem)
      this.tipoEnvio = $event.content
  }

  sendOrder(){
    let order = new OrderSales()
    order.CardCode = this.businesPartner.CardCode
    order.BPL_IDAssignedToInvoice = this.branchId
    order.DocumentLines = this.itens.map(it => it.getDocumentsLines(this.tipoOperacao))
    order.PaymentMethod = this.formaPagamento
    order.PaymentGroupCode = this.condicaoPagamento
    order.comments = this.observacao
    order.DocDueDate = this.dtEntrega
    this.orderService.save(order).subscribe(it =>{
      console.log(it)
      this.alertService.info("Seu pedido foi Enviado")
      
    })
  }

  isFormValid() : boolean{
    return this.businesPartner 
      && this.branchId 
      && this.dtEntrega
      && this.formaPagamento 
      && this.condicaoPagamento 
      && this.itens 
      && this.tipoEnvio
      && this.itens.length > 0
  }
}

export class OrderSales{
  CardCode: string
  DocumentLines : Array<DocumentLines>
  BPL_IDAssignedToInvoice : string
  DocDueDate : string = '2024-08-05'
  shipToCode : string
  //forma pagamento
  PaymentMethod : string
  //condicao pagamento
  PaymentGroupCode : string
  comments : string
}

export class DocumentLines{
  ItemCode
  Quantity
  PriceList
  Usage
  DiscountPercent
  U_preco_negociado
}
