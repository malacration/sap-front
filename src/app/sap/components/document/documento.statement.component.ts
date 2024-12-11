import { Component, OnInit, ViewChild } from '@angular/core';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { Option } from '../../model/form/option';
import { RadioItem } from '../form/radio/radio.model';
import { Item } from '../../model/item';
import { AlertService } from '../../service/alert.service';
import { BranchSelectComponent } from '../form/branch/branch-select.component';
import { Router } from '@angular/router';
import { Observable, forkJoin} from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { formatCurrency } from "@angular/common"
import * as moment from 'moment';
import { OrderSalesService } from '../../service/document/order-sales.service';
import { DocumentAngularSave } from '../../service/document/document-angular-save';
import { QuotationService } from '../../service/document/quotation.service';
import { Branch } from '../../model/branch';

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
  selectedBranch: Branch = null;

  @ViewChild('branch', {static: true}) vcBranch: BranchSelectComponent;

  tipoEnvioRadio : Array<RadioItem> = [new RadioItem("Retirada","ret"), new RadioItem("Entrega","ent")]
  tipoOperacaoOptions: Array<Option> = [new Option(9,"venda"), new Option(16,"venda com entrega futura")]

  constructor(private businesPartnerService : BusinessPartnerService,
    private quotationService : QuotationService,
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

  changeCondicaoPagamento($event){
    if($event.GroupNum)
      this.itens.filter(it => it.PriceList == $event.ListNum)
      .forEach(it => {
        it.GroupNum = $event.GroupNum
        it.descontoCondicaoPagamento = $event.U_desconto
        it.jurosCondicaoPagamento = $event.U_juros
      })
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

  selectBranch(branch: Branch){
    this.branchId = branch.bplid;
    this.selectedBranch = branch; 
    this.changeOperacao();
  }

  selectBp($event){
    this.businesPartner = $event
    this.businesPartnerService.get(this.businesPartner.CardCode).subscribe(it =>{
        this.businesPartner = it
    })
  }

  setVehicleState() { 
    if (this.tipoEnvio == 'ret') {
      this.dtEntrega = moment().format('YYYY-MM-DD');
      return this.selectedBranch?.prefState || '';
    } else {
      this.dtEntrega = null;
      return null;
    }
  }
  
  tipoEnvioChange($event){
    if($event instanceof RadioItem)
      this.tipoEnvio = $event.content

    this.setVehicleState();
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

    let service : DocumentAngularSave = this.quotationService
    
    if(this.config.tipoOperacao.filter(it => it.id == this.tipoOperacao)[0].document == 'ordersales' && this.tipoEnvio == 'ret')
      service = this.orderService

    this.agruparPorGroupNum().forEach((itens,groupNum) => {
      let order = new PedidoVenda()
      order.CardCode = this.businesPartner.CardCode
      order.BPL_IDAssignedToInvoice = this.branchId
      order.DocumentLines = itens.map(it => it.getDocumentsLines(this.tipoOperacao))
      order.PaymentMethod = this.formaPagamento
      order.PaymentGroupCode = groupNum
      order.comments = this.observacao
      order.DocDueDate = this.dtEntrega
      order.Frete = this.frete
      subiscribers.push(service.save(order))
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

  agruparPorGroupNum(): Map<string, Item[]> {
    return this.itens.reduce((map, item) => {
        const group = item.GroupNum;
        if (!map.has(group)) {
            map.set(group, []);
        }
        map.get(group)?.push(item);
        return map;
    }, new Map<string, Item[]>());
  }
}

export class PedidoVenda{
  CardCode: string
  DocNum: number
  DocDate: string
  DocTotal: number
  ItemCode
  DocumentLines : Array<LinhasPedido>
  BPL_IDAssignedToInvoice : string
  DocDueDate : string = '2024-08-05'
  shipToCode : string
  //forma pagamento
  PaymentMethod : string
  //condicao pagamento
  PaymentGroupCode : string
  comments : string
  Frete : number
  VehicleState: string

  get totalCurrency() {
    return formatCurrency(this.DocTotal, 'pt', 'R$');
  } 

  get dataCriacao(){
    return moment(this.DocDate).format('DD/MM/YYYY'); 
  }
} 

export class LinhasPedido{
  ItemCode
  Quantity
  PriceList
  Usage
  DiscountPercent
  U_preco_negociado
  UnitPrice
  ItemDescription
  MeasureUnit
  SalUnitMsr
}
