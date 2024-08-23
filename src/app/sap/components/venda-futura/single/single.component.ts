
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { VendaFutura } from '../../../model/venda-futura';
import { Column } from '../../../../shared/components/table/column.model';
import { DownPaymentService } from '../../../service/DownPaymentService';



@Component({
  selector: 'app-venda-futura-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class VendaFuturaSingleComponent implements OnInit {


  constructor(private downPaymentService : DownPaymentService){

  }

  cardName = "windson"
  id = "666"
  
  @Input() 
  selected: VendaFutura = null;

  boletos = Array()

  @Output()
  close = new EventEmitter();

  ngOnInit(): void {
    this.downPaymentService.getByContrato(this.selected.DocEntry).subscribe(it => {
      this.boletos = it
    })
  }

  voltar(){
    this.close.emit()
  }

  action($event){

  }

  definition = [
    new Column('Código do Item', 'U_itemCode'),
    new Column('Descrição', 'U_description'),
    new Column('Preço Negociado', 'U_precoNegociado'),
    new Column('Quantidade', 'U_quantity'),
    new Column('Total', 'total')
  ];

  boletosDefinition = [
    new Column('Código', 'DocNum'),
    new Column('Vencimento', 'vencimento'),
    new Column('Total', 'totalCurrency')
  ];

}
