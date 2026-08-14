import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { LocalidadeDefinition } from '../../../../sap/model/localidade/localidade-definition';
import { LocalidadeService } from '../../_services/localidade.service';
import { SearchComponent } from '../../../../shared/components/search/search.component';
import { Localidade } from '../../../../sap/model/localidade/localidade';




@Component({
  selector: 'app-localidade-search',
  templateUrl: './localidade-search.component.html',
})
export class LocalidadeSearchComponent {

  localidadeDefinition = new LocalidadeDefinition().getDefinition()

  @ViewChild('search', {static: true}) search: SearchComponent<Localidade>;

  @Output()
  selected = new EventEmitter();

  constructor(public lcService : LocalidadeService){

  }

  selectedFun($event){
    this.selected.emit($event)
  }

  clear(){
    this.search?.clear()
  }

}