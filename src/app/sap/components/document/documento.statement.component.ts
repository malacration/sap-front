import { Component, OnInit, ViewChild } from '@angular/core';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { Option } from '../../model/form/option';
import { RadioItem } from '../form/radio/radio.model';
import { Item } from '../../model/item';
import { OrderSalesService } from '../../service/order-sales.service';
import { AlertService } from '../../service/alert.service';
import { BranchSelectComponent } from '../form/branch/branch-select.component';
import { Router } from '@angular/router';
import { Observable, forkJoin} from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { BusinessPartner } from '../../model/business-partner/business-partner';

@Component({
  selector: 'app-document-statement',
  templateUrl: './document.statement.component.html',
  styleUrls: ['./document.statement.component.scss'],
})
export class DocumentStatementComponent implements OnInit {

  branchId = undefined
  tipoEnvio
  businesPartner : BusinessPartner = null;
  formaPagamento
  observacao
  itens : Array<Item>
  tipoOperacao
  dtEntrega
  loading = false
  frete : number = 0

  @ViewChild('branch', {static: true}) vcBranch: BranchSelectComponent;

  tipoEnvioRadio : Array<RadioItem> = [new RadioItem("Retirada","ret"), new RadioItem("Entrega","ent")]
  tipoOperacaoOptions: Array<Option> = [new Option(9,"venda"), new Option(16,"venda com entrega futura")]

  constructor(private businesPartnerService : BusinessPartnerService,
    private orderService : OrderSalesService,
    private config : ConfigService,
    private router : Router,
    private alertService : AlertService){
  }
  
  ngOnInit(): void {
    
  }

  changeOperacao(){
    if(this.config.tipoOperacao.length > 0 && this.branchId)
      this.tipoOperacaoOptions = this.config.tipoOperacao.filter(it => it.filiais.includes(this.branchId) ).map(it => new Option(it.id,it.label))
  }

  changePageBusinesPartner(){
    
  }
  
  changeFormaPagamento($event){
    console.log($event)
    this.formaPagamento = $event
  }

  changeCondicaoPagamento($event : any){
    if($event.GroupNum)
      this.itens.filter(it => it.PriceList == $event.ListNum).forEach(it => it.GroupNum = $event.GroupNum)
  }

  changeAllCondicao($event : any){
    if($event.GroupNum){
      this.itens.forEach(it => it.GroupNum = $event.GroupNum)
    }
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
    this.changeOperacao()
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
    return this.itens
  }

  total() : number{
    return this.itens.reduce((acc,it) => acc+it.unitPriceLiquid()*it.quantidade,0)+this.frete
  }

  sendOrder(){
    this.loading = true
    let subiscribers = Array<Observable<any>>();

    this.tabelas().forEach(tabela => {
      let order = new OrderSales()
      order.CardCode = this.businesPartner.CardCode
      order.BPL_IDAssignedToInvoice = this.branchId
      order.DocumentLines = this.itens.filter(it => it.PriceList == tabela).map(it => it.getDocumentsLines(this.tipoOperacao))
      order.PaymentMethod = this.formaPagamento
      order.PaymentGroupCode = this.itens.filter(it => it.PriceList == tabela).map(it => it.GroupNum)[0]
      order.comments = this.observacao
      order.DocDueDate = this.dtEntrega
      order.Frete = this.frete
      subiscribers.push(this.orderService.save(order))
    })
    forkJoin(subiscribers).subscribe({ 
      next:result => {
        this.concluirEnvio();
      },
      error : result => {
        this.loading = false
      },
    });
  }

  concluirEnvio(){
    this.alertService.info("Seu pedido foi Enviado").then(() => {
      this.loading = false
      this.limparFormulario()
    })
  }

  limparFormulario(){
    this.router.navigateByUrl('/RefreshComponent', { skipLocationChange: true }).then(() => {
      this.router.navigate(['venda/cotacao']);
    });
  }

  isFormValid() : boolean{
    return this.businesPartner 
      && this.branchId 
      && this.dtEntrega
      && this.formaPagamento
      && this.itens 
      && this.tipoEnvio
      && this.tipoOperacao
      && this.itens?.length > 0
      && this.itens.filter(it => !it.GroupNum).length == 0
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
  Frete : number
}

export class DocumentLines{
  ItemCode
  Quantity
  PriceList
  Usage
  DiscountPercent
  U_preco_negociado
}
