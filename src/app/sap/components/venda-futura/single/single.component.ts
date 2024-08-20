
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { VendaFutura } from '../../../model/venda-futura';
import { Column } from '../../../../shared/components/table/column.model';



@Component({
  selector: 'app-venda-futura-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class VendaFuturaSingleComponent implements OnInit {

  cardName = "windson"
  id = "666"
  
  @Input() 
  selected: VendaFutura = null;

  definition = [
    new Column('Código do Item', 'U_itemCode'),
    new Column('Descrição', 'U_description'),
    new Column('Preço Negociado', 'U_precoNegociado'),
    new Column('Quantidade', 'U_quantity'),
    new Column('Total', 'total')
  ];

  @Output()
  close = new EventEmitter();

  ngOnInit(): void {
    
  }

  voltar(){
    this.close.emit()
  }

  action($event){

  }

}
