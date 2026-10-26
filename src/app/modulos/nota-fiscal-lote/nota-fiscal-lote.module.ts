import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { NotaFiscalLoteComponent } from './componentes/nota-fiscal-lote.component';

@NgModule({
  declarations: [
    NotaFiscalLoteComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    SapSharedModule,
  ],
  exports: [
    NotaFiscalLoteComponent,
  ]
})
export class NotaFiscalLoteModule {
}
