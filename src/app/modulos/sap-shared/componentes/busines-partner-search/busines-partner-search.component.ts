import { Component, EventEmitter, Output } from '@angular/core';
import { BusinessPartnerDefinition } from '../../../../sap/model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../_services/business-partners.service';




@Component({
  selector: 'app-busines-partner-search',
  templateUrl: './busines-partner-search.component.html',
})
export class BusinesPartnerSearchComponent {

  businessPartnerDefinition = new BusinessPartnerDefinition().getDefinition()

  @Output()
  selected = new EventEmitter();

  constructor(public bpService : BusinessPartnerService){

  }

  selectedFun($event){
    this.selected.emit($event)
  }

}
