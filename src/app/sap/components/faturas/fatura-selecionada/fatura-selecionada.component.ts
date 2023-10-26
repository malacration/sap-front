import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';



@Component({
  selector: 'app-fatura-selecionada',
  templateUrl: './fatura-selecionada.component.html',
})
export class FaturaSelecionadaComponent implements OnInit {
  
  @Input()
  fatura: any; 

  parcelas : any[] = ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10"];

  @Output()
  close : EventEmitter<any> = new EventEmitter<any>();;

  ngOnInit(): void {

  }

  voltar($event){
    this.close.emit($event);
  }

}
