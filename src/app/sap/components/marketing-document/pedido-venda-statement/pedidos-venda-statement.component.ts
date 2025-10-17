import { Component, OnInit } from '@angular/core';
import { PedidosVendaService } from '../../../service/document/pedidos-venda.service';
import { DocumentList } from '../../../model/markting/document-list';
import { ActionReturn } from '../../../../shared/components/action/action.model';



@Component({
  selector: 'app-marketing-document-pedidos-venda',
  templateUrl: './pedidos-venda-statement.component.html',
  styleUrls: ['./pedidos-venda-statement.component.scss']
})
export class PedidosVendaStatementComponent {

  selectedDocumentList : DocumentList = null
  
  constructor(public pedidosVendaService : PedidosVendaService){
    
  }
  
  action(event : ActionReturn){
    if(event.type == "selected"){
      this.selectedDocumentList = event.data
    }
  }
}
