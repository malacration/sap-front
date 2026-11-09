import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { BusinessPartnerDefinition } from '../../../../sap/model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../_services/business-partners.service';


@Component({
    selector: 'app-transportadora-search',
    templateUrl: './transportadora-search.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
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