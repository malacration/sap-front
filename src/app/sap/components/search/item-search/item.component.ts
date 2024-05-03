import { Component, OnInit } from '@angular/core';
import { BusinessPartnerDefinition } from '../../../model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../../service/business-partners.service';




@Component({
  selector: 'app-item-search',
  templateUrl: './item-search.component.html',
})
export class ItemSearchComponent implements OnInit {

  definition = new BusinessPartnerDefinition().getDefinition()

  constructor(public service : BusinessPartnerService){
    
  }

  ngOnInit(): void {
    console.log("valor do service",this.service)
  }
}
