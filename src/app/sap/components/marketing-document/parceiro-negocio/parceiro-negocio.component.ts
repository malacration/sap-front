import { Component, OnInit } from '@angular/core';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { Page } from '../../../model/page.model';
import { Column } from '../../../../shared/components/table/column.model';
import { AuthService } from '../../../../shared/service/auth.service';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';



@Component({
  selector: 'app-parceiro-negocio-statement',
  templateUrl: './parceiro-negocio.component.html',
  styleUrls: ['./parceiro-negocio.component.scss']
})
export class ParceiroNegocioComponent implements OnInit {

  nomeUsuario : string
  loading = false
  pageContent : Page<BusinessPartner> = new Page()
  selected : BusinessPartner = null

  definition = [
    new Column('Código do Parceiro', 'CardCode'),
    new Column('Nome do Parceiro', 'CardName'),
    new Column('Telefone do Parceiro', 'Phone1'),
  ]

  constructor(
    private auth : AuthService,
    private service :  BusinessPartnerService){
    this.nomeUsuario = auth.getUser()
  }

  ngOnInit(): void {
    this.pageChange(0)
  }

  pageChange($event) {
    this.loading = true;
    this.service.getParceiro($event).subscribe({
      next: (it: Page<any>) => {
        this.pageContent = it;
      },
      complete: () => { this.loading = false; }
    });
  }


  action(event : ActionReturn){
    if(event.type == "selected"){
      this.selected = event.data
    }
  }

  close(){
    this.selected = null
  }

}