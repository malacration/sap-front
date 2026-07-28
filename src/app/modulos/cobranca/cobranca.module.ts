import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { CobrancaStatementComponent } from './componentes/cobranca-statement.component';
import { RegistrarAcaoModalComponent } from './componentes/registrar-acao-modal.component';
import { CobrancaService } from '../../sap/service/cobranca/cobranca.service';

@NgModule({
  declarations: [
    CobrancaStatementComponent,
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
  ]
})
export class CobrancaModule {
}
