import { BrowserModule } from '@angular/platform-browser';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

import { AppRoutingModule } from './app-routing.module';

import {BrowserAnimationsModule} from '@angular/platform-browser/animations';


// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app.component';
import { HeaderComponent } from './layout/header/header.component';
import { StoreModule } from '@ngrx/store';
import { uiReducer } from './store/ui/reducer';
import { MenuSidebarComponent } from './layout/menu-sidebar/menu-sidebar.component';
import { MessagesComponent } from './layout/header/messages/messages.component';
import { NotificationsComponent } from './layout/header/notifications/notifications.component';
import { UserComponent } from './layout/header/user/user.component';
import { ToastrModule } from 'ngx-toastr';
import { MenuItemComponent } from './layout/menu-sidebar/menu-item/menu-item.component';
import { HomeComponent } from './home/home.component';
import { RomaneioFazendaInsumoComponent } from './sap/components/romaneio-fazenda-insumo/romaneio-fazenda-insumo.component';
import { RomaneioComponent } from './sap/components/romaneio/romaneio.component';
import { RomaneioFazendaInsumoService } from './sap/service/romaneio-fazenda-insumo.service';
import { TransferenciaClientesComponent } from './sap/components/transferencia-clientes/transferencia.clientes.component';



import { NgxPaginationModule } from 'ngx-pagination';
import { AlertService } from './sap/service/alert.service';
import { ErrorInterceptor } from './interceptors/error.interceptor';
import { BusinessPlacesService } from './sap/service/business-places.service';
import { FilterBusinessPlaceComponent } from './sap/components/filters/business-place/filter-business-place.component';
import { FilterNumeroNfComponent } from './sap/components/filters/numero-nf/filter-numero-nf.component';
import { CadastroComponent } from './sap/components/cadastro/cadastro.component';
import { EnderecoComponent } from './sap/components/cadastro/endereco/endereco.component';
import { ReferenciaComponent } from './sap/components/cadastro/referencia-comercial/referencia.component';
import { SelectComponent } from './sap/components/form/select/select.component';
import { StateService } from './sap/service/addresses/state.service';
import { CitySelectComponent } from './sap/components/form/select/city/city-select.component';
import { CityService } from './sap/service/addresses/city.service';
import { BusinessPartnerService } from './sap/service/business-partners.service';
import { FileUploadComponent } from './shared/components/file-upload/file-upload.component';
import { FaturasComponent } from './sap/components/faturas/faturas.component';
import { FaturaSelecionadaComponent } from './sap/components/faturas/fatura-selecionada/fatura-selecionada.component';
import { FaturasService } from './sap/service/fatura/faturas.service';

import { ActionComponent } from './shared/components/action/action.component';
import { CpfCnpjPipe } from './shared/directives/pipes/cpf-cnpj-pipe';
import { MomentPipe } from './shared/directives/pipes/moment-pipe';
import localeBr from '@angular/common/locales/pt';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import { ListaFaturaComponent } from './sap/components/faturas/lista-fatura/lista-fatura.component';
import { AutenticacaoFaturaComponent } from './sap/components/faturas/autenticacao-fatura/autenticacao-fatura.component';
import { RadioComponent } from './sap/components/form/radio/radio.component';
import { OneTimePasswordService } from './sap/service/one-time-password.service';
import { JwtInterceptor } from './interceptors/jwt.interceptor';
import { DatasComponent } from './sap/components/filters/datas/datas.component';
import { DocumentStatementComponent } from './sap/components/document/documento.statement.component';
import { ItensComponent } from './sap/components/document/itens/itens.component';
import { ModalComponent } from './shared/components/modal/modal.component';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BusinesPartnerSearchComponent } from './sap/components/search/busines-partner-search/busines-partner-search.component';
import { ItemSearchComponent } from './sap/components/search/item-search/item.component';
import { SearchComponent } from './shared/components/search/search.component';
import { ModalSelectComponent } from './shared/components/modal/select/modal.select.component';
import { ItemService } from './sap/service/item.service';
import { BranchSelectComponent } from './sap/components/form/branch/branch-select.component';
import { BranchService } from './sap/service/branch.service';
import { StateSelectComponent } from './sap/components/form/select/state/state-select.component';
import { FormaPagamentoSelectComponent } from './sap/components/form/select/forma-pagamento/forma-pagamento-select.component';
import { CondicaoPagamentoSelectComponent } from './sap/components/form/select/condicao-pagamento/condicao-pagamento-select.component';
import { CondicaoPagamentoService } from './sap/service/condicao-pagamento.service';
import { SalesPersonSearchComponent } from './sap/components/search/sales-person-search/sales-person-search.component';
import { CurrencyInputComponent } from './shared/components/currency/currency-input.component';
import { LoginComponent } from './shared/components/login/login.component';
import { ListComponent } from './sap/components/marketing-document/core/list/list.component';
import { CotacoesStatementComponent } from './sap/components/marketing-document/cotacao-statement/cotacoes-statement.component';
import { DocumentCoreComponent } from './sap/components/marketing-document/core/document-core.component';
import { CotacaoService } from './sap/service/document/cotacao.service';
import { VendaFuturaStatementComponent } from './sap/components/venda-futura/venda-futura-statement.component';
import { VendaFuturaSingleComponent } from './sap/components/venda-futura/single/single.component';
import { TabComponent } from './shared/components/tabs/tab/tab.component';
import { TabsComponent } from './shared/components/tabs/tabs.component';
import { PedidosVendaService } from './sap/service/document/pedidos-venda.service';
import { PedidosVendaStatementComponent } from './sap/components/marketing-document/pedido-venda-statement/pedidos-venda-statement.component';
import { DocumentListSingleComponent } from './sap/components/marketing-document/core/single-document-list/single-document-list.component';
import { DownPaymentService } from './sap/service/DownPaymentService';
import { RetiradaComponent } from './sap/components/venda-futura/retirada/retirada.component';
import { FutureDeliverySalesService } from './sap/service/FutureDeliverySales.service';
import { FormaPagamentoService } from './sap/service/forma-pagamento.service';
import { ParceiroNegocioComponent } from './sap/components/parceiro-negocio/parceiro-negocio.component';
import { ParceiroNegocioSingleComponent } from './sap/components/parceiro-negocio/single-parceiro-negocio/single-parceiro-negocio.component';
import { ManageRolesComponent } from './sap/components/manage-roles/manage-roles.component';
import { AssignRoleComponent } from './sap/components/assign-role/assign-role.component';
import { OrderSalesService } from './sap/service/document/order-sales.service';
import { QuotationService } from './sap/service/document/quotation.service';
import { TrocaComponent } from './sap/components/venda-futura/troca/troca.component';
import { DescontoComponent } from './sap/components/document/desconto/desconto.component';
import { GerarPdfComponent } from './sap/components/venda-futura/gerar-pdf/gerar-pdf.component';
import { CalculadoraModule } from './modulos/calculadora-preco-venda/calculadora.module';
import { ProducaoModule } from './modulos/producao/producao.module';


registerLocaleData(localeBr);

 
// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader =>  new TranslateHttpLoader(http, './assets/i18n/', '.json');

@NgModule({
  declarations: [
    CpfCnpjPipe,
    MomentPipe,
    AppComponent,
    HeaderComponent,
    MenuSidebarComponent,
    MessagesComponent,
    NotificationsComponent,
    UserComponent,
    MenuItemComponent,
    HomeComponent,
    RomaneioComponent,
    RomaneioFazendaInsumoComponent,
    TransferenciaClientesComponent,
    FilterNumeroNfComponent,
    FilterBusinessPlaceComponent,
    CadastroComponent,
    EnderecoComponent,
    ReferenciaComponent,
    StateSelectComponent,
    CitySelectComponent,
    FileUploadComponent,
    FaturasComponent,
    FaturaSelecionadaComponent,
    ListaFaturaComponent,
    AutenticacaoFaturaComponent,
    RadioComponent,
    DatasComponent,
    DocumentStatementComponent,
    ItensComponent,
    ModalSelectComponent,
    BusinesPartnerSearchComponent,
    SearchComponent,
    ItemSearchComponent,
    BranchSelectComponent,
    FormaPagamentoSelectComponent,
    CondicaoPagamentoSelectComponent,
    CurrencyInputComponent,
    LoginComponent,
    SalesPersonSearchComponent,
    CurrencyInputComponent,
    ListComponent,
    CotacoesStatementComponent,
    PedidosVendaStatementComponent,
    ManageRolesComponent,
    AssignRoleComponent,
    DocumentCoreComponent,
    VendaFuturaStatementComponent,
    VendaFuturaSingleComponent,
    ParceiroNegocioComponent,
    ParceiroNegocioSingleComponent,
    RetiradaComponent,
    GerarPdfComponent,
    DocumentListSingleComponent,
    PedidosVendaStatementComponent,
    DescontoComponent,
    TabsComponent,
    TabComponent,
    TrocaComponent
  ],
  imports: [
    NgxPaginationModule,
    CalculadoraModule,
    BrowserModule,
    BrowserAnimationsModule,
    ProducaoModule,
    FormsModule,
    CoreModule,
    SharedModule,
    ReactiveFormsModule,
    
    AppRoutingModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true
    }),
    // ProfabricComponentsModule,
    StoreModule.forRoot({ui: uiReducer}),
  ],
  providers: [
    {
      provide: LOCALE_ID,
      useValue: "pt-BR"
    },
    {
      provide:  DEFAULT_CURRENCY_CODE,
      useValue: 'BRL'
    },
    RomaneioFazendaInsumoService,
    FormaPagamentoService,
    BusinessPlacesService,
    StateService,
    AlertService,
    FaturasService,
    CityService,
    BusinessPartnerService,
    OneTimePasswordService,
    DownPaymentService,
    BsModalService,
    ItemService,
    BranchService,
    QuotationService,
    OrderSalesService,
    CondicaoPagamentoService,
    CotacaoService,
    PedidosVendaService,
    CurrencyPipe,
    FutureDeliverySalesService,
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
