import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import { PageNotFoundComponent } from './components/';
import { WebviewDirective } from './directives/';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { TableComponent } from './components/table/table.component';
import { ActionComponent } from './components/action/action.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { SafeHtmlDirective } from './directives/safe-html/safe-html.directive';
import { SelectComponent } from '../sap/components/form/select/select.component';
import { ParameterService } from './service/parameter.service';
import { AuthService } from './service/auth.service';
import { PercentageDirective } from './directives/percentage.directive';
import { CurrencyDirective } from './directives/curency.directive';
import { PaginacaoComponent } from './components/paginacao/paginacao.component';
import { ModalComponent } from './components/modal/modal.component';
import { ChangePassowrd } from './components/change-password/change-password.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { NormalTextDirective } from './directives/normalText.directive';
import { TabsComponent } from './components/tabs/tabs.component';
import { TabComponent } from './components/tabs/tab/tab.component';
import { ModalSelectComponent } from './components/modal/select/modal.select.component';

@NgModule({
  providers: [
    ParameterService,
    AuthService,
  ],
  declarations: [
    PageNotFoundComponent,
    ModalSelectComponent,
    ProgressBarComponent,
    WebviewDirective,
    TableComponent,
    ActionComponent,
    SafeHtmlDirective,
    SelectComponent,
    PercentageDirective,
    CurrencyDirective,
    NormalTextDirective,
    PaginacaoComponent,
    TabsComponent,
    TabComponent,
    ModalComponent,
    ChangePassowrd
  ],
  imports: [
    CommonModule, 
    BrowserModule,
    RouterModule,
    BrowserAnimationsModule,
    TranslateModule,
    FormsModule,
    BrowserModule,
    ReactiveFormsModule
  ],
  exports: [
    TranslateModule, 
    ModalSelectComponent,
    WebviewDirective, 
    FormsModule,
    TableComponent,
    CommonModule,
    SelectComponent,
    PercentageDirective,
    CurrencyDirective,
    NormalTextDirective,
    PaginacaoComponent,
    ModalComponent,
    ReactiveFormsModule,
    ProgressBarComponent,
    TabsComponent,
    TabComponent,
    ChangePassowrd
  ]
})
export class SharedModule {}
