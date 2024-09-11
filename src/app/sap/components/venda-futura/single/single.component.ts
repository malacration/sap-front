import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DownPaymentService } from '../../../service/DownPaymentService';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { FutureDeliverySalesService } from '../../../service/FutureDeliverySales.service';
import {VendaFutura } from '../../../model/venda/venda-futura';
import { DocumentLines, FutureDeliverySales } from '../../../model/markting/future-delivery-sales';



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

  @ViewChild('retirada', {static: true}) buscaModal: ModalComponent;

  ngOnInit(): void {
    this.downPaymentService.getByContrato(this.selected.DocEntry).subscribe(it => {
      this.boletos = it;
    });
    
    this.futureDeliverySalesService.getByNotaFiscalSaida(this.selected.DocEntry).subscribe(response => {
      this.entregas = response.flatMap(entrega => 
        entrega.DocumentLines.map(line => {
          return Object.assign(new DocumentLines(), line, entrega)
        })
      )
    })
  }
  
  voltar(){
    this.close.emit()
  }

  action($event){

  }

  openModal(){
    this.buscaModal.classeModal = "modal-xl"
    this.buscaModal.openModal()
  }


  closeModal($event){
    this.buscaModal.closeModal()
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
    new Column('Total', 'totalCurrency'),
    new Column('Status', 'situacao'),
  ];

  entregasDefinition = [
    new Column('ID', 'DocNum'),
    new Column('Número da Nota', 'SequenceSerial'),
    new Column('Data de Emissão', 'formattedDocDate'),
    new Column('Código do Item', 'ItemCode'),
    new Column('Descrição do Item', 'ItemDescription'),
    new Column('Preço Negociado', 'U_preco_negociado'),
    new Column('Quantidade Total', 'Quantity'),
    new Column('Total da Linha', 'totalLinhaCurrency'),
  ];
}
