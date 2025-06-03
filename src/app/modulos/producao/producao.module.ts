import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ReprocessamentoComponent } from './componentes/reprocessamento/repreocessamento.component';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { ReprocessamentoService } from './_services/reprocessamento.service';


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
