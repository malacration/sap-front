import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Option } from '../../../../model/form/option';
import { CityService } from '../../../../service/addresses/city.service';


@Component({
  selector: 'app-condicao-pagamento-select',
  templateUrl: './condicao-pagamento-select.component.html'
})
export class CondicaoPagamentoSelectComponent implements OnInit {

  constructor(private service : CityService){
      
  }

  @Input()
  selected : string = null

  opcoes : Array<Option> = [new Option("10 dias","10 dias")]

  loading = false

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange($event){
    this.selectedOut.emit($event)
  }

  ngOnInit(): void {
  }  
}
