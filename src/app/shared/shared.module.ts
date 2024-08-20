import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import { PageNotFoundComponent } from './components/';
import { WebviewDirective } from './directives/';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { TabComponent } from './components/tabs/tab/tab.component';
import { TabsComponent } from './components/tabs/tabs.component';

@NgModule({
  declarations: [
    PageNotFoundComponent, 
    WebviewDirective
  ],
  imports: [CommonModule, TranslateModule, FormsModule,BrowserModule],
  exports: [TranslateModule, WebviewDirective, FormsModule]
})
export class SharedModule {}
