import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ReprocessamentoComponent } from './componentes/reprocessamento/repreocessamento.component';
import { ReprocessamentoService } from './_services/reprocessamento.service';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { OrdemProducaoListComponent } from './componentes/ordem-producao/ordem-producao-list.component';
import { OrdemProducaoDetalheComponent } from './componentes/ordem-producao/ordem-producao-detalhe.component';


@NgModule({
  declarations: [
    ReprocessamentoComponent,
    OrdemProducaoListComponent,
    OrdemProducaoDetalheComponent
  ],
  imports: [
    // routerLink nas telas de ordem de producao (o SharedModule nao reexporta o RouterModule)
    RouterModule,
    SharedModule,
    SapSharedModule
  ],
  providers: [
    ReprocessamentoService
  ]
})
export class ProducaoModule {

}
