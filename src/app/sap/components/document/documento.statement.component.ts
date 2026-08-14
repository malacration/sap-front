import { Component, OnInit, ViewChild } from '@angular/core';
import { BusinessPartnerService } from '../../../modulos/sap-shared/_services/business-partners.service';
import { Option } from '../../model/form/option';
import { RadioItem } from '../form/radio/radio.model';
import { Item } from '../../model/item';
import { AlertService } from '../../../shared/service/alert.service';
import { Router } from '@angular/router';
import { Observable, forkJoin} from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import * as moment from 'moment';
import { OrderSalesService } from '../../../modulos/sap-shared/_services/documents/order-sales.service';
import { DocumentAngularSave } from '../../service/document/document-angular-save';
import { QuotationService } from '../../service/document/quotation.service';
import { Branch } from '../../model/branch';
import { BranchSelectComponent } from '../../../modulos/sap-shared/componentes/branch/branch-select.component';
import { PedidoVenda } from '../../model/document/pedido-venda.model';
import { RegiaoService } from '../../../modulos/sap-shared/_services/regiao.service';

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

  //frete calculado automaticamente a partir da localidade de entrega do cliente
  //(ver recalcularFrete) - freteErro bloqueia o envio do pedido (isFormValid)
  calculandoFrete = false
  freteErro : string = null

  @ViewChild('branch', {static: true}) vcBranch: BranchSelectComponent;

  tipoEnvioRadio : Array<RadioItem> = [new RadioItem("Retirada","ret"), new RadioItem("Entrega","ent")]
  tipoOperacaoOptions: Array<Option> = [new Option(9,"venda"), new Option(16,"venda com entrega futura")]

  constructor(private businesPartnerService : BusinessPartnerService,
    private quotationService : QuotationService,
    private orderService : OrderSalesService,
    private regiaoService : RegiaoService,
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
    this.recalcularFrete()
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
    this.branchId = branch.Bplid;
    this.selectedBranch = branch;
    this.changeOperacao();
    this.recalcularFrete()
  }

  selectBp($event){
    this.businesPartner = $event
    this.businesPartnerService.get(this.businesPartner.CardCode).subscribe(it =>{
        this.businesPartner = it
        this.recalcularFrete()
    })
  }

  /**
   * Frete automatico: usa a localidade do endereco de entrega (bo_ShipTo) do
   * cliente pra achar a regiao ativa da filial selecionada e calcular o
   * valor (Regiao.calcularFrete, mesma formula do simulador de Frete). Sem
   * localidade cadastrada ou sem regiao cobrindo ela, freteErro fica setado
   * e bloqueia o envio (ver isFormValid/sendOrder) - o back tambem valida
   * isso de novo antes de gravar, entao nao da pra contornar so pelo front.
   */
  private recalcularFrete(){
    this.freteErro = null
    if(this.tipoEnvio != 'ent'){
      this.frete = 0
      return
    }
    if(!this.businesPartner || !this.itens || this.itens.length == 0)
      return
    const enderecoEntrega = (this.businesPartner.BPAddresses || []).find(it => it.AddressType == 'bo_ShipTo')
    const codLocalidade = enderecoEntrega?.U_Localidade
    if(!codLocalidade){
      this.frete = 0
      this.freteErro = 'O cliente selecionado não possui localidade cadastrada no endereço de entrega. Cadastre a localidade antes de finalizar a venda.'
      return
    }
    if(!this.branchId)
      return
    const quantidade = this.itens.reduce((acc,it) => acc+it.quantidade,0)
    this.calculandoFrete = true
    this.regiaoService.getByLocalidade(String(codLocalidade)).subscribe({
      next : (regioes) => {
        this.calculandoFrete = false
        const regiao = regioes.find(it => it.ativa && it.U_Filial == this.branchId)
        const resultado = regiao?.calcularFrete(String(codLocalidade), quantidade)
        if(!resultado){
          this.frete = 0
          this.freteErro = 'Não foi possível calcular o frete para a localidade do cliente (nenhuma região de frete ativa cobre essa localidade para a filial selecionada).'
          return
        }
        this.frete = resultado.total
      },
      error : () => {
        this.calculandoFrete = false
        this.frete = 0
        this.freteErro = 'Não foi possível calcular o frete para o cliente selecionado.'
      }
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
    this.recalcularFrete()
  }

  temFormaPagamento(){
    return this.itens
  }

  total() : number{
    return this.itens.reduce((acc,it) => acc+it.unitPriceLiquid()*it.quantidade,0)+this.frete
  }

  sendOrder(){
    if(this.freteErro){
      this.alertService.error(this.freteErro)
      return
    }
    this.loading = true
    let subiscribers = Array<Observable<any>>();

    let service : DocumentAngularSave = this.quotationService
    let redirectRoute = 'venda/cotacao'

    const tipoOperacaoSelecionado = this.config.tipoOperacao.filter(it => it.id == this.tipoOperacao)[0]
    if(tipoOperacaoSelecionado?.document == 'ordersales' && this.tipoEnvio == 'ret') {
      service = this.orderService
      redirectRoute = 'venda/pedidos-venda'
    }

    this.agruparPorGroupNum().forEach((itens,groupNum) => {
      let order = new PedidoVenda()
      order.CardCode = this.businesPartner.CardCode
      order.BPL_IDAssignedToInvoice = this.branchId
      order.DocumentLines = itens.map(it => it.getDocumentsLines(this.tipoOperacao))
      order.PaymentMethod = this.formaPagamento
      order.PaymentGroupCode = groupNum
      order.Comments = this.observacao
      order.DocDueDate = this.dtEntrega
      order.Frete = this.frete
      order.TaxExtension = {
        VehicleState: this.setVehicleState(),
        Incoterms: this.tipoEnvio == 'ret' ? 9 : 0
      };
      subiscribers.push(service.save(order))
    })
    forkJoin(subiscribers).subscribe({
      next:results => {
        //quando uma regra de autorizacao pega o documento (ex.: cliente com
        //pagamento em atraso), o back devolve 202 + {pendente:true, motivo} em vez
        //do documento criado - ver AutorizacaoPendenteDto/RegraAutorizacaoService
        const pendentes = (results || []).filter((r : any) => r?.pendente)
        if(pendentes.length > 0)
          this.concluirEnvioPendente(pendentes, redirectRoute)
        else
          this.concluirEnvio(redirectRoute);
      },
      error : result => {
        this.loading = false
      },
    });
  }

  concluirEnvio(redirectRoute: string){
    this.alertService.info("Seu pedido foi Enviado").then(() => {
      this.loading = false
      this.limparFormulario(redirectRoute)
    })
  }

  concluirEnvioPendente(pendentes: Array<any>, redirectRoute: string){
    const motivos = [...new Set(pendentes.map(p => p.motivo))].join(', ')
    this.alertService.info(
      `Seu documento foi enviado para autorização (motivo: ${motivos}) e aguarda liberação antes de ser criado no SAP.`
    ).then(() => {
      this.loading = false
      this.limparFormulario(redirectRoute)
    })
  }

  limparFormulario(redirectRoute: string = 'venda/cotacao'){
    this.router.navigateByUrl('/RefreshComponent', { skipLocationChange: true }).then(() => {
      this.router.navigate([redirectRoute]);
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
      && !this.freteErro
      && !this.calculandoFrete
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
