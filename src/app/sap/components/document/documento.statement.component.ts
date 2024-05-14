import { Component, OnInit, ViewChild } from '@angular/core';
import { BusinessPartnerDefinition } from '../../model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { Option } from '../../model/form/option';
import { RadioItem } from '../form/radio/radio.model';
import { Item } from '../../model/item';
import { OrderSalesService } from '../../service/order-sales.service';
import { AlertSerice } from '../../service/alert.service';
import { CondicaoPagamento } from '../../service/condicao-pagamento.service';

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

  changeCondicaoPagamento($event : any){
    if($event instanceof CondicaoPagamento)
      this.itens.filter(it => it.PriceList == $event.listNum).forEach(it => it.GroupNum = $event.groupNum)
  }

  changeAllCondicao($event : any){
    if($event instanceof CondicaoPagamento){
      console.log("change all")
      this.itens.forEach(it => it.GroupNum = $event.groupNum)
    }
    console.log("no change"+JSON.stringify($event))
    console.log($event.groupNum)
  }

  changeItens($event){
    this.itens = $event
  }

  changeTipoOperacao($event){
    this.tipoOperacao = $event
  }

  tabelas() : Array<string>{
    return Object.keys(this.itens.reduce((result:any, currentValue:any) => { 
      (result[currentValue['PriceList']] = result[currentValue['PriceList']] || []).push(currentValue);
      return result;
    }, {}));
  }

  getTabela() : string{
    let tabelas = this.tabelas()
    if(tabelas && tabelas.length > 0)
      return tabelas[0]
  }

  itensBy(priceList){
    return this.itens.filter(it => it.PriceList == priceList)
  }

  isMutiplasTabelas(){
    if(this.itens){
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
    })
  }

  tipoEnvioChange($event){
    if($event instanceof RadioItem)
      this.tipoEnvio = $event.content
  }

  temFormaPagamento(){
    console.log(this.itens)
    return this.itens
  }

  sendOrder(){
    this.tabelas().forEach(tabela => {
      let order = new OrderSales()
      order.CardCode = this.businesPartner.CardCode
      order.BPL_IDAssignedToInvoice = this.branchId
      order.DocumentLines = this.itens.filter(it => it.PriceList == tabela).map(it => it.getDocumentsLines(this.tipoOperacao))
      order.PaymentMethod = this.formaPagamento
      order.PaymentGroupCode = this.itens.filter(it => it.PriceList == tabela).map(it => it.GroupNum)[0]
      order.comments = this.observacao
      order.DocDueDate = this.dtEntrega
      this.orderService.save(order).subscribe(it =>{
        this.alertService.info("Seu pedido foi Enviado")
      })
    })
  }

  isFormValid() : boolean{
    return this.businesPartner 
      && this.branchId 
      && this.dtEntrega
      && this.formaPagamento 
      && this.itens 
      && this.tipoEnvio
      && this.itens?.length > 0
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
