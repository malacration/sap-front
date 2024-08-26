
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { notaFiscalSaida, VendaFutura } from '../../../model/venda-futura';
import { Column } from '../../../../shared/components/table/column.model';
import { DownPaymentService } from '../../../service/DownPaymentService';
import { FutureDeliverySalesService } from '../../../service/FutureDeliverySales.service';



@Component({
  selector: 'app-venda-futura-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class VendaFuturaSingleComponent implements OnInit {


  constructor(private downPaymentService : DownPaymentService, private futureDeliverySalesService : FutureDeliverySalesService ){

  }

  cardName = "windson"
  id = "666"
  
  @Input() 
  selected: VendaFutura = null;

  boletos = Array()

  entregas = Array()

  @Output()
  close = new EventEmitter();

  ngOnInit(): void {
    this.downPaymentService.getByContrato(this.selected.DocEntry).subscribe(it => {
        this.boletos = it;
    });
    this.futureDeliverySalesService.getByNotaFiscalSaida(this.selected.DocEntry).subscribe(it => {
      this.entregas = it.map(entrega => Object.assign(new notaFiscalSaida(), entrega));
    });
}
  voltar(){
    this.close.emit()
  }

  action($event){

  }

  definition = [
    new Column('Código do Item', 'U_itemCode'),
    new Column('Descrição', 'U_description'),
    new Column('Preço Negociado', 'precoNegociadoCurrency'),
    new Column('Quantidade', 'U_quantity'),
    new Column('Total', 'totalCurrency')
  ];

  boletosDefinition = [
    new Column('Código', 'DocNum'),
    new Column('Vencimento', 'vencimento'),
    new Column('Total', 'totalCurrency')
  ];

  entregasDefinition = [
    new Column('ID', 'DocNum'),
    new Column('Número da Nota', 'SequenceSerial'),
    new Column('Data de Emissão', 'formattedDocDate'),
    new Column('Total da Nota', 'totalCurrency'),
  ];
}
