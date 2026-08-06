import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { CobrancaStatementComponent } from './componentes/cobranca-statement.component';
import { CobrancaDashboardComponent } from './componentes/cobranca-dashboard.component';
import { RegistrarAcaoModalComponent } from './componentes/registrar-acao-modal.component';
import { CobrancaService } from '../../sap/service/cobranca/cobranca.service';

@NgModule({
  declarations: [
    CobrancaStatementComponent,
    CobrancaDashboardComponent,
    RegistrarAcaoModalComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    SapSharedModule,
  ],
  providers: [
    CobrancaService,
  ],
  exports: [
    CobrancaStatementComponent,
    CobrancaDashboardComponent,
  ]
})
export class CobrancaModule {
}
