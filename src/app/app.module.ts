import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

import { AppRoutingModule } from './app-routing.module';

import {BrowserAnimationsModule} from '@angular/platform-browser/animations';


// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app.component';
import { RomaneioService } from './core/services/romaneio.service';
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

// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader =>  new TranslateHttpLoader(http, './assets/i18n/', '.json');

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    MenuSidebarComponent,
    MessagesComponent,
    NotificationsComponent,
    UserComponent,
    MenuItemComponent,
    HomeComponent,
    RomaneioComponent,
    EntradaInsumoComponent
  ],
  imports: [
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
    RomaneioService,
    RomaneioEntradaInsumoService
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
