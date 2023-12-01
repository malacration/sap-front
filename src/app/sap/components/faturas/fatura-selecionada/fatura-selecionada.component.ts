import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Parcela, ParcelaDefinition } from '../../../model/fatura/parcela.model';



@Component({
  selector: 'app-fatura-selecionada',
  templateUrl: './fatura-selecionada.component.html',
})
export class FaturaSelecionadaComponent implements OnInit {
  
  @Input()
  fatura: any; 

  parcelas : Array<any> = [
    new Parcela("1", "01/01/2021", 100, "01/01/2021"),
  ];

  definition = new ParcelaDefinition().getFaturaDefinition();

  @Output()
  close : EventEmitter<any> = new EventEmitter<any>();;

  ngOnInit(): void {

  }

  voltar($event){
    this.close.emit($event);
  }

}
