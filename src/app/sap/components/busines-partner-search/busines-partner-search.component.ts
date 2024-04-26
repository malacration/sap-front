import { Component, OnInit } from '@angular/core';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { BusinessPartnerDefinition } from '../../model/business-partner/business-partner-definition';
import { Page } from '../../model/page.model';
import { BusinessPartnerService } from '../../service/business-partners.service';




@Component({
  selector: 'app-busines-partner-search',
  templateUrl: './busines-partner-search.component.html',
})
export class BusinesPartnerSearchComponent implements OnInit {

  businessPartnerDefinition = new BusinessPartnerDefinition().getDefinition()
  keyword
  loading = false
  resultadoBusca : Page<BusinessPartner> = new Page()

  constructor(private bpService : BusinessPartnerService){

  }
  ngOnInit(): void {
  }

  changePage($event){
    //TODO arrumar scroll infinito
    this.loading = true
    this.bpService.search($event).subscribe(it => {
      this.resultadoBusca.content.push(...it.content)
      this.resultadoBusca.nextLink = it.nextLink
      this.loading = false
    })
  }

  search($event){
    this.keyword = $event
    this.resultadoBusca.content.splice(0, this.resultadoBusca.content.length)
    this.changePage($event)
  }
}
