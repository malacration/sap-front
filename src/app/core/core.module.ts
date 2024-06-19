import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from './services/config.service';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../shared/service/auth.service';

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
