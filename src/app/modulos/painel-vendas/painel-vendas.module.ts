import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { SharedModule } from '../../shared/shared.module';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { PainelVendasComponent } from './componentes/painel-vendas/painel-vendas.component';
import { PainelVendasService } from './service/painel-vendas.service';
import { PainelVendasV2Component } from './componentes/painel-vendas-v2/painel-vendas-v2.component';
import { PainelVendasV2Service } from './service/painel-vendas-v2.service';

@NgModule({
  declarations: [PainelVendasComponent, PainelVendasV2Component],
  imports: [CommonModule, SharedModule, SapSharedModule, NgxChartsModule, TooltipModule.forRoot()],
  providers: [PainelVendasService, PainelVendasV2Service],
  exports: [PainelVendasComponent, PainelVendasV2Component],
})
export class PainelVendasModule {}
