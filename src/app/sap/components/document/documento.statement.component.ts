import { Component, OnInit, ViewChild } from '@angular/core';
import { BusinessPartnerDefinition } from '../../model/business-partner/business-partner-definition';
import { BusinessPartnerService } from '../../service/business-partners.service';

@Component({
  selector: 'app-document-statement',
  templateUrl: './document.statement.component.html',
  styleUrls: ['./document.statement.component.scss'],
})
export class DocumentStatementComponent implements OnInit {

  
  

  constructor(private businesPartnerService : BusinessPartnerService){
    
  }
  
  ngOnInit(): void {
    
  }

  changePageBusinesPartner(){
    alert("change page Bp")
  }

  

}
