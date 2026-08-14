import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { Page } from '../../model/page.model';
import { AuthService } from '../../../shared/service/auth.service';
import { BusinessPartnerService } from '../../../modulos/sap-shared/_services/business-partners.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SalesPerson } from '../../model/sales-person/sales-person';
import { SalesPersonSearchComponent } from '../../../modulos/sap-shared/componentes/sales-person-search/sales-person-search.component';

interface ParceiroNegocioListState {
  pageContent: Page<BusinessPartner>;
  paginaAtual: number;
  cardCodeFilter: string;
  cardNameFilter: string;
  cpfCnpjFilter: string;
  vendedorSelecionado: SalesPerson;
}

@Component({
  selector: 'app-parceiro-negocio-statement',
  templateUrl: './parceiro-negocio.component.html',
  styleUrls: ['./parceiro-negocio.component.scss']
})
export class ParceiroNegocioComponent implements OnInit, OnDestroy {
  private static listState: ParceiroNegocioListState = null;

  nomeUsuario : string
  loading = false
  pageContent : Page<BusinessPartner> = new Page()
  selected : BusinessPartner = null
  vendedorSelecionado : SalesPerson = null
  paginaAtual = 0
  listaCarregada = false
  private routeSub!: Subscription

  @ViewChild(SalesPersonSearchComponent) salesPersonSearch : SalesPersonSearchComponent

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth : AuthService,
    private service :  BusinessPartnerService){
    this.nomeUsuario = auth.getUser()
  }

  ngOnInit(): void {
    this.restaurarEstadoLista();
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
        this.selected = null
        if(!this.listaCarregada)
          this.pageChange(this.paginaAtual)
        this.loading = false
      }
    });
  }

  pageChange($event) {
    this.loading = true;
    this.paginaAtual = $event;
    const cardCode = (this.cardCodeFilter || '').trim();
    const cardName = (this.cardNameFilter || '').trim();
    const cpfCnpj = (this.cpfCnpjFilter || '').trim();
    const filter = {
      cardCode: cardCode.length ? cardCode : null,
      cardName: cardName.length ? cardName : null,
      cpfCnpj: cpfCnpj.length ? cpfCnpj : null,
      salesPersonCode: this.vendedorSelecionado?.SalesEmployeeCode || null
    };
    this.service.getClientes($event, filter).subscribe({
      next: (it: Page<any>) => {
        this.pageContent = it;
        this.listaCarregada = true;
        this.salvarEstadoLista();
      },
      complete: () => { this.loading = false; }
    });
  }


  selecionar(parceiro : BusinessPartner){
    this.salvarEstadoLista();
    this.router.navigate(['/clientes/parceiro-negocio', parceiro.CardCode]);
  }

  close(){
    this.router.navigate(['/clientes/parceiro-negocio']);
    this.selected = null;
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
    this.vendedorSelecionado = null;
    this.salesPersonSearch?.clear();
    this.listaCarregada = false;
    ParceiroNegocioComponent.listState = null;
    this.pageChange(0);
  }

  selecionaVendedor($event : SalesPerson){
    this.vendedorSelecionado = $event || null;
  }

  cpfCnpj(parceiro : BusinessPartner) : String {
    return parceiro.CpfCnpjStr() || '-';
  }

  vendedor(parceiro : BusinessPartner) : string {
    return parceiro.SalesEmployeeName || (parceiro.SalesPersonCode != null ? String(parceiro.SalesPersonCode) : '-');
  }

  cardCodeFilter : string
  cardNameFilter : string
  cpfCnpjFilter : string

  private salvarEstadoLista() {
    if(!this.listaCarregada) return;
    ParceiroNegocioComponent.listState = {
      pageContent: this.pageContent,
      paginaAtual: this.paginaAtual,
      cardCodeFilter: this.cardCodeFilter,
      cardNameFilter: this.cardNameFilter,
      cpfCnpjFilter: this.cpfCnpjFilter,
      vendedorSelecionado: this.vendedorSelecionado,
    };
  }

  private restaurarEstadoLista() {
    const state = ParceiroNegocioComponent.listState;
    if(!state) return;

    this.pageContent = state.pageContent;
    this.paginaAtual = state.paginaAtual;
    this.cardCodeFilter = state.cardCodeFilter;
    this.cardNameFilter = state.cardNameFilter;
    this.cpfCnpjFilter = state.cpfCnpjFilter;
    this.vendedorSelecionado = state.vendedorSelecionado;
    this.listaCarregada = true;
  }

}
