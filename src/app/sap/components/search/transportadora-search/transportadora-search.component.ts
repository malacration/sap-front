import { Component, EventEmitter, Output } from '@angular/core';
import { BusinessPartnerDefinition } from '../../../model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../../service/business-partners.service';




@Component({
  selector: 'app-transportadora-search',
  templateUrl: './transportadora-search.component.html',
})
export class TransportadoraSearchComponent {

  businessPartnerDefinition = new BusinessPartnerDefinition().getDefinition()

  @Output()
  selected = new EventEmitter();

  constructor(public bpService : BusinessPartnerService){

  }

  selectedFun($event){
    this.selected.emit($event)
  }

}