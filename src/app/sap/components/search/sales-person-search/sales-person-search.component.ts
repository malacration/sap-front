import { Component, EventEmitter, Output } from '@angular/core';
import { SalesPersonDefinition } from '../../../model/sales-person/sales-person-definition';
import { SalesPersonService } from '../../../service/sales-person.service';


@Component({
  selector: 'app-sales-person-search',
  templateUrl: './sales-person-search.component.html',
})
export class SalesPersonSearchComponent {

  salesPersonDefinition = new SalesPersonDefinition().getDefinition()

  @Output()
  selected = new EventEmitter();

  constructor(public bpService : SalesPersonService){

  }

  selectedFun($event){
    this.selected.emit($event)
  }

}
