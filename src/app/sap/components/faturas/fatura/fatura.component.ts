import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Fatura } from '../../../model/fatura/fatura.model';



@Component({
  selector: 'app-fatura',
  templateUrl: './fatura.component.html',
})
export class FaturaComponent implements OnInit {
  

  @Input()
  fatura: Fatura;

  @Output()
  faturaSelected: EventEmitter<any> = new EventEmitter<any>();;

  ngOnInit(): void {
  }

  selecionaFatura(){
    this.faturaSelected.emit(this.fatura);
  }



}
