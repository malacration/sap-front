import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from './services/config.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
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
