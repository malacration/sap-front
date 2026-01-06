import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ReprocessamentoComponent } from './componentes/reprocessamento/repreocessamento.component';
import { ReprocessamentoService } from './_services/reprocessamento.service';
import { SapSharedModule } from '../sap-shared/sap-shared.module';


@NgModule({
  declarations: [
    ReprocessamentoComponent
  ],
  imports: [
    SharedModule,
    SapSharedModule
  ],
  providers: [
    ReprocessamentoService
  ]
})
export class ProducaoModule {

}
