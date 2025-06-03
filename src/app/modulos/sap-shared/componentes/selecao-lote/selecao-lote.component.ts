import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { BatchStockService } from '../../_services/BatchStockService';
import { BatchStock } from '../../_models/BatchStock.model';
import { Column } from '../../../../shared/components/table/column.model';

@Component({
  selector: 'selecao-lote',
  templateUrl: './selecao-lote.component.html',
  standalone: false,
})
export class SelecaoLoteComponent implements OnChanges, OnInit {

  _itemCode
  
  @Input()
  itemCode : string

  @Input()
  codDeposito : string

  @Input()
  quantidade : number

  @Output()
  lotesSelecionados : EventEmitter<Array<BatchStock>> = new EventEmitter<Array<BatchStock>>();

  
  

  lotes : Array<BatchStock> = new Array()

  definition = [
    new Column('Numero Lote', 'DistNumber'),
    new Column('Quantidade disponível', 'Quantity'),
    new Column('Quantidade selecionada', 'quantitySelecionadaEditable'),
    new Column('Data Vencimento', 'ExpDate')
  ]

  loading = false

  constructor(private service : BatchStockService){

  }
  
  ngOnInit(): void {
    this.change();
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['itemCode'] || changes['codDeposito']) {
      this.change();
    }
  }

  change(){
    this.loading = true
    this.lotes = []
    this.service.get(this.itemCode,this.codDeposito).subscribe(it =>{
      this.lotes = it
      this.loading = false
    })
  }

  totalSelecionado() : number{
    return this.lotes.reduce((acc, it)  => (Number(it.quantitySelecionadaEditable?? 0)) + acc,0)
  }

  isDisable(){
    return this.totalSelecionado() !== this.quantidade
  }

  confirmar(){
    this.lotesSelecionados.emit(this.lotes.filter(it => it.quantitySelecionadaEditable > 0))
  }
}