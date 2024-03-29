import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
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
import { EntradaInsumoComponent } from './sap/components/entrada-insumo/entrada-insumo.component';
import { RomaneioComponent } from './sap/components/romaneio/romaneio.component';
import { RomaneioEntradaInsumoService } from './sap/service/romaneio-entrada-insumo.service';
import { PaginacaoComponent } from './sap/components/paginacao/paginacao.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { AlertSerice } from './sap/service/alert.service';
import { ErrorInterceptor } from './interceptors/error.interceptor';
import { BusinessPlacesService } from './sap/service/business-places.service';
import { FilterBusinessPlaceComponent } from './sap/components/filters/business-place/filter-business-place.component';
import { FilterNumeroNfComponent } from './sap/components/filters/numero-nf/filter-numero-nf.component';
import { CadastroComponent } from './sap/components/cadastro/cadastro.component';
import { EnderecoComponent } from './sap/components/cadastro/endereco/endereco.component';
import { ReferenciaComponent } from './sap/components/cadastro/referencia-comercial/referencia.component';
import { SelectComponent } from './sap/components/form/select/select.component';
import { StateSelectComponent } from './sap/components/form/state/state-select.component';
import { StateService } from './sap/service/addresses/state.service';
import { CitySelectComponent } from './sap/components/form/city/city-select.component';
import { CityService } from './sap/service/addresses/city.service';
import { BusinessPartnerService } from './sap/service/business-partners.service';
import { FileUploadComponent } from './shared/components/file-upload/file-upload.component';
import { FaturasComponent } from './sap/components/faturas/faturas.component';
import { FaturaSelecionadaComponent } from './sap/components/faturas/fatura-selecionada/fatura-selecionada.component';
import { FaturasService } from './sap/service/fatura/faturas.service';
import { TableComponent } from './shared/components/table/table.component';
import { SafeHtmlDirective } from './shared/directives/safe-html/safe-html.directive';
import { ActionComponent } from './shared/components/action/action.component';
import { CpfCnpjPipe } from './shared/directives/pipes/cpf-cnpj-pipe';
import { MomentPipe } from './shared/directives/pipes/moment-pipe';
import localeBr from '@angular/common/locales/pt';
import { registerLocaleData } from '@angular/common';
import { ListaFaturaComponent } from './sap/components/faturas/lista-fatura/lista-fatura.component';
import { AutenticacaoFaturaComponent } from './sap/components/faturas/autenticacao-fatura/autenticacao-fatura.component';
import { RadioComponent } from './sap/components/form/radio/radio.component';
import { OneTimePasswordService } from './sap/service/one-time-password.service';
import { JwtInterceptor } from './interceptors/jwt.interceptor';
import { DatasComponent } from './sap/components/filters/datas/datas.component';



registerLocaleData(localeBr, 'pt');

 
// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader =>  new TranslateHttpLoader(http, './assets/i18n/', '.json');

@NgModule({
  declarations: [
    CpfCnpjPipe,
    MomentPipe,
    SafeHtmlDirective,
    AppComponent,
    HeaderComponent,
    MenuSidebarComponent,
    MessagesComponent,
    NotificationsComponent,
    UserComponent,
    MenuItemComponent,
    HomeComponent,
    RomaneioComponent,
    EntradaInsumoComponent,
    PaginacaoComponent,
    FilterNumeroNfComponent,
    FilterBusinessPlaceComponent,
    CadastroComponent,
    EnderecoComponent,
    ReferenciaComponent,
    SelectComponent,
    StateSelectComponent,
    CitySelectComponent,
    FileUploadComponent,
    FaturasComponent,
    FaturaSelecionadaComponent,
    ListaFaturaComponent,
    AutenticacaoFaturaComponent,
    RadioComponent,
    TableComponent,
    ActionComponent,
    DatasComponent,
  ],
  imports: [
    NgxPaginationModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    CoreModule,
    SharedModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true
    }),
    // ProfabricComponentsModule,
    StoreModule.forRoot({ui: uiReducer}),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  providers: [
    RomaneioEntradaInsumoService,
    BusinessPlacesService,
    StateService,
    AlertSerice,
    FaturasService,
    CityService,
    BusinessPartnerService,
    OneTimePasswordService,
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
