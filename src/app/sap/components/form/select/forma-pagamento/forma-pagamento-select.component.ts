import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Option } from '../../../../model/form/option';
import { CityService } from '../../../../service/addresses/city.service';


@Component({
  selector: 'app-forma-pagamento-select',
  templateUrl: './forma-pagamento-select.component.html'
})
export class FormaPagamentoSelectComponent implements OnInit {

  constructor(private service : CityService){
      
  }

  @Input()
  selected : string = null
  
  opcoes : Array<Option> = [
    new Option("AVISTA","DEPOSITO"),
    new Option("BB-RC-BOL-1199","BOLETO")
  ]

  loading = false

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange($event){
    this.selectedOut.emit($event)
  }

  ngOnInit(): void {
  }  
}
