import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from './services/config.service';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: ConfigService, useFactory: () => {
        // @ts-ignore
        return Object.assign(new ConfigService(), window['app-config']);
      },
    }
  ]
})
export class CoreModule {

}
