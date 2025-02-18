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

  routeSubscriptions : Array<Subscription> = new Array()

  definition = [
    new Column('ID', 'DocEntry'),
    new Column('Nome', 'routerLinkPn'),
    new Column('Produtos', 'produtosCurrency'),
    new Column('Frete', 'frete'),
    new Column('Valor Total', 'totalCurrency'),
    new Column('Criado em', 'dataCriacao')
  ]
  
  constructor(
    private auth : AuthService,
    private route: ActivatedRoute,
    private parameterService : ParameterService,
    private service :  VendaFuturaService){
    this.nomeUsuario = auth.getUser()
  }

  ngOnInit(): void {
    this.pageChange(0)

    this.routeSubscriptions = this.parameterService.subscribeToParam(this.route, "id", id => {
      if(id) {
        this.service.get(id).subscribe(it => {
          this.selected = it
        })
      }
    })
  }

  pageChange($event){
    this.loading = true
    this.service.getAll($event,this.all).subscribe({
      next : (it: Page<any>) => {
        this.pageContent = it
      },
      complete : () => {this.loading = false}
    })
  }

  action(event : ActionReturn){
    if(event.type == "selected"){
      this.parameterService.setParam(this.route,"id",event.data.DocEntry)
    }
  }

  close(): void {
    this.selected = null
    this.parameterService.removeParam(this.route,"id")
  }

  onToggleAll(){
    this.all = !this.all
    this.pageChange(0)
  }

  ngOnDestroy(): void {
    this.routeSubscriptions.forEach(it => it.unsubscribe)
  }

}
