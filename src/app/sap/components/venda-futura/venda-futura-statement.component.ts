import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/service/auth.service';
import { Page } from '../../model/page.model';
import { DocumentService } from '../marketing-document/core/documento.service';
import { CotacaoService } from '../../service/document/cotacao.service';
import { Column } from '../../../shared/components/table/column.model';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { VendaFuturaService } from '../../service/venda-futura.service';
import { VendaFutura } from '../../model/venda-futura';



@Component({
  selector: 'app-venda-futura-statement',
  templateUrl: './venda-futura-statement.component.html',
  styleUrls: ['./venda-futura-statement.component.scss']
})
export class VendaFuturaStatementComponent implements OnInit {

  nomeUsuario : string
  loading = false
  pageContent : Page<VendaFutura> = new Page()
  selected : VendaFutura = null

  definition = [
    new Column('ID', 'DocEntry'),
    new Column('Nome', 'U_cardName'),
    new Column('Produtos', 'produtosCurrency'),
    new Column('Frete', 'frete'),
    new Column('Valor Total', 'totalCurrency'),
    new Column('Criado em', 'dataCriacao')
  ]
  
  constructor(
    private auth : AuthService,
    private service :  VendaFuturaService){
    this.nomeUsuario = auth.getUser()
  }

  ngOnInit(){
    this.pageChange(0)
  }


  pageChange($event){
    this.loading = true
    this.service.get($event).subscribe({
      next : (it: Page<any>) => {
        this.pageContent = it
      },
      complete : () => {this.loading = false}
    })
  }

  action(event : ActionReturn){
    if(event.type == "selected"){
      this.selected = event.data
    }
  }

  close(){
    this.selected = null
  }

}
