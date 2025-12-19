import { Component, EventEmitter, Output } from '@angular/core';
import { LocalidadeDefinition } from '../../../../sap/model/localidade/localidade-definition';
import { LocalidadeService } from '../../_services/localidade.service';




@Component({
  selector: 'app-localidade-search',
  templateUrl: './localidade-search.component.html',
})
export class LocalidadeSearchComponent {

  localidadeDefinition = new LocalidadeDefinition().getDefinition()

  @Output()
  selected = new EventEmitter();

  constructor(public lcService : LocalidadeService){

  }

  selectedFun($event){
    this.selected.emit($event)
  }

}