import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BusinessPartnerDefinition } from '../../../../sap/model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../_services/business-partners.service';
import { SearchService } from '../../../../sap/service/search.service';
import { BusinessPartner } from '../../../../sap/model/business-partner/business-partner';




@Component({
  selector: 'app-busines-partner-search',
  templateUrl: './busines-partner-search.component.html',
})
export class BusinesPartnerSearchComponent {

  businessPartnerDefinition = new BusinessPartnerDefinition().getDefinition()

  @Input()
  initial : any

  // Opcional: outra busca no lugar do /business-partners/search (que recorta pela carteira do
  // vendedor). Sem ela, o comportamento e o de sempre.
  @Input()
  service : SearchService<BusinessPartner>

  @Output()
  selected = new EventEmitter();

  constructor(public bpService : BusinessPartnerService){

  }

  selectedFun($event){
    this.selected.emit($event)
  }

}
