import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/service/auth.service';
import { Page } from '../../model/page.model';
import { Column } from '../../../shared/components/table/column.model';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { VendaFuturaService } from '../../service/venda-futura.service';
import { VendaFutura } from '../../model/venda/venda-futura';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ParameterService } from '../../../shared/service/parameter.service';
import { AlertService } from '../../service/alert.service';
import { FutureDeliverySalesService } from '../../service/FutureDeliverySales.service';
import { DocumentLines } from '../../model/markting/future-delivery-sales';



@Component({
  selector: 'app-venda-futura-statement',
  templateUrl: './venda-futura-statement.component.html',
  styleUrls: ['./venda-futura-statement.component.scss']
})
export class VendaFuturaStatementComponent implements OnInit, OnDestroy {

  nomeUsuario : string
  loading = false
  pageContent : Page<VendaFutura> = new Page()
  selected : VendaFutura = null
  all = false

  filialSelecioanda = "-1"
  idContrato = ""
  
  status: 'aberto' | 'concluido' | 'cancelado' = 'aberto'


  routeSubscriptions : Array<Subscription> = new Array()

  definition = [
    new Column('ID', 'DocEntry'),
    new Column('Nome', 'routerLinkPn'),
    new Column('Vendedor', 'SalesEmployeeName'),
    new Column('Filial', 'replaceFilial'),
    new Column('Produtos', 'TotalProdutosCalculadoCurrency'),
    new Column('Frete', 'frete'),
    new Column('Valor Total', 'totalCurrency'),
    new Column('Valor Entregue', 'valorEntregue'),
    new Column('Criado em', 'dataCriacao'),
    new Column('Status', 'U_status')
  ]
  
  constructor(
    private futureDeliverySalesService : FutureDeliverySalesService,
    private auth : AuthService,
    private route: ActivatedRoute,
    private alertService : AlertService,
    private parameterService : ParameterService,
    private service :  VendaFuturaService){
    this.nomeUsuario = auth.getUser()
  }

  ngOnInit(): void {
    this.loadInicial()

    this.routeSubscriptions = this.parameterService.subscribeToParam(this.route, "id", id => {
      if(id) {
        let contrato = this.pageContent.content.find(it => it.DocEntry.toString() == id)
        if(contrato){
          this.selected = contrato
          this.service.getAllItens(contrato.DocEntry).subscribe(it => {
            contrato.AR_CF_LINHACollection = it
          })
        }
        else{
          this.service.get(id).subscribe(it => {
            this.selected = it
          })
        }
      }
    })
  }

  loadInicial(){
    this.loading = true
    const idContrato = this.idContrato == "" ? "-1" : this.idContrato
    this.service.getAll(this.filialSelecioanda,idContrato,this.status).subscribe({
      next : (it: Page<any>) => {
        this.pageContent = it
      },
      complete : () => {this.loading = false}
    })
  }

  changePageFunction(nextLink){
    this.loading = true
    this.service.getNextLink(nextLink).subscribe(it => {
      it.content = [...this.pageContent.content,...it.content]
      this.pageContent = it
      this.loading = false
    })
  }
  
  action(event : ActionReturn){
    if(event.type == "selected"){
      this.parameterService.setParam(this.route,"id",event.data.DocEntry)
    }
    if(event.type == "carregaEntregas"){
      this.carregaEntregas(event.data)
    }
  }

  carregaEntregas(vendaFutura : VendaFutura){
    vendaFutura.entregaLoading = true
    this.service.getEntregas(vendaFutura.DocEntry).subscribe(notas => {
      vendaFutura.entregas = notas
      vendaFutura.entregaLoading = false
    })
  }

  close(): void {
    this.selected = null
    this.parameterService.removeParam(this.route,"id")
  }

  ngOnDestroy(): void {
    this.routeSubscriptions.forEach(it => it.unsubscribe)
  }

  selectBranch($event){
    this.filialSelecioanda = $event.Bplid
  }

  limpar(){
    this.filialSelecioanda = "-1"
    this.idContrato = ""
    this.status = 'aberto'
    this.ngOnInit()
  }

}
