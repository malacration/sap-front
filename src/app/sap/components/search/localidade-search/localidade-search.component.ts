import { Component, EventEmitter, Output } from '@angular/core';
import { BusinessPartnerDefinition } from '../../../model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { LocalidadeDefinition } from '../../../model/localidade/localidade-definition';
import { LocalidadeService } from '../../../service/localidade.service';




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