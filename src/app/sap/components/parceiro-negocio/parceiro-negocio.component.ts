import { Component, OnDestroy, OnInit } from '@angular/core';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { Page } from '../../model/page.model';
import { Column } from '../../../shared/components/table/column.model';
import { AuthService } from '../../../shared/service/auth.service';
import { BusinessPartnerService } from '../../../modulos/sap-shared/_services/business-partners.service';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';



@Component({
  selector: 'app-parceiro-negocio-statement',
  templateUrl: './parceiro-negocio.component.html',
  styleUrls: ['./parceiro-negocio.component.scss']
})
export class ParceiroNegocioComponent implements OnInit, OnDestroy {

  nomeUsuario : string
  loading = false
  pageContent : Page<BusinessPartner> = new Page()
  selected : BusinessPartner = null
  private routeSub!: Subscription

  definition = [
    new Column('Código do Parceiro', 'CardCode'),
    new Column('Nome do Parceiro', 'CardName'),
    new Column('Telefone do Parceiro', 'Phone1'),
  ]

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth : AuthService,
    private service :  BusinessPartnerService){
    this.nomeUsuario = auth.getUser()
  }

  ngOnInit(): void {
    this.loading = true
    this.routeSub = this.route.paramMap.subscribe(params => {
      let cardCodeSeleted = params.get('cardCode');
      if(cardCodeSeleted){
        this.service.get(cardCodeSeleted).subscribe(businesPartner => {
          this.selected = businesPartner
          this.loading = false
        })
      }
      else{
        this.pageChange(0)
        this.loading = false
      }
    });
  }

  pageChange($event) {
    this.loading = true;
    const cardCode = (this.cardCodeFilter || '').trim();
    const cardName = (this.cardNameFilter || '').trim();
    const cpfCnpj = (this.cpfCnpjFilter || '').trim();
    const filter = {
      cardCode: cardCode.length ? cardCode : null,
      cardName: cardName.length ? cardName : null,
      cpfCnpj: cpfCnpj.length ? cpfCnpj : null
    };
    this.service.getClientes($event, filter).subscribe({
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
    this.router.navigate(['../'], { // Navega para a rota pai, removendo o parâmetro 'id'
      relativeTo: this.route, // Navega em relação à rota atual
      queryParamsHandling: 'preserve' // Mantém os parâmetros de consulta, se existirem
    });
    this.selected = null
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  limpar(){
    this.cardCodeFilter = '';
    this.cardNameFilter = '';
    this.cpfCnpjFilter = '';
    this.pageChange(0);
  }

  cardCodeFilter : string
  cardNameFilter : string
  cpfCnpjFilter : string

}
