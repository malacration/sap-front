import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Parcela, ParcelaDefinition } from '../../../model/fatura/parcela.model';
import { Fatura } from '../../../model/fatura/fatura.model';



@Component({
  selector: 'app-fatura-selecionada',
  templateUrl: './fatura-selecionada.component.html',
})
export class FaturaSelecionadaComponent implements OnInit {
  
  @Input()
  fatura: Fatura; 

  parcelas : Array<any> = [];

  definition = new ParcelaDefinition().getFaturaDefinition();

  @Output()
  close : EventEmitter<any> = new EventEmitter<any>();;

  ngOnInit(): void {
    this.parcelas = this.fatura.parcelas
    console.log(this.fatura)
  }

  voltar($event){
    this.close.emit($event);
  }

}
