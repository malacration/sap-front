import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { SalesPersonDefinition } from '../../../../sap/model/sales-person/sales-person-definition';
import { SalesPersonService } from '../../../../sap/service/sales-person.service';
import { SearchComponent } from '../../../../shared/components/search/search.component';
import { SalesPerson } from '../../../../sap/model/sales-person/sales-person';


@Component({
  selector: 'app-sales-person-search',
  templateUrl: './sales-person-search.component.html',
})
export class SalesPersonSearchComponent {
  @Input() name : string

  salesPersonDefinition = new SalesPersonDefinition().getDefinition()

  @ViewChild('search', {static: true}) search: SearchComponent<SalesPerson>;

  @Output()
  selected = new EventEmitter();

  constructor(public spService : SalesPersonService){

  }

  selectedFun($event){
    this.selected.emit($event)
  }

  clear(){
    this.search?.clear()
  }

}
