import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { SharedModule } from '../../shared/shared.module';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { PainelVendasComponent } from './componentes/painel-vendas/painel-vendas.component';
import { PainelVendasService } from './service/painel-vendas.service';

@NgModule({
  declarations: [PainelVendasComponent],
  imports: [CommonModule, SharedModule, SapSharedModule, NgxChartsModule],
  providers: [PainelVendasService],
  exports: [PainelVendasComponent],
})
export class PainelVendasModule {}
