import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { OrdemCarregamentoStatementComponent } from './componentes/statement';
import { OrdemCarregamentoService } from './service/ordem-carregamento.service';
import { CommonModule } from '@angular/common';
import { ListComponent } from './componentes/list/list';
import { OrdemCarregamentoSelectedComponent } from './componentes/selected/selected';
import { PdfCarregamentoService } from './service/pdf-carregamento.service';
import { RomaneioPdfComponent } from './componentes/romaneio-pdf/romaneio-pdf.component';
import { ItinerarioPdfComponent } from './componentes/itinerario-pdf.component/itinerario-pdf.component';
import { PainelExpedicaoPedidosComponent } from './componentes/painel-expedicao-pedidos/painel-expedicao-pedidos.component';
import { PedidosCarregamentoService } from './service/pedidos-carregamento.service';
import { DualListBoxComponent } from './componentes/dual-list-box/dual-list-box.component';
import { FormularioComponent } from './componentes/formulario/formulario.component';
import { SelecaoLotesModalComponent } from './modals/selecao-lotes-modal/selecao-lotes-modal.component';
import { RomaneioModalComponent } from './modals/romaneio-modal/romaneio-modal.component';
import { ItinerarioModalComponent } from './modals/itinerario-modal/itinerario-modal.component';


@NgModule({
  declarations: [
    OrdemCarregamentoStatementComponent,
    OrdemCarregamentoSelectedComponent,
    RomaneioPdfComponent,
    ItinerarioPdfComponent,
    ListComponent,
    PainelExpedicaoPedidosComponent,
    DualListBoxComponent,
    FormularioComponent,
    SelecaoLotesModalComponent,
    RomaneioModalComponent,
    ItinerarioModalComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    SapSharedModule
  ],
  providers: [
    OrdemCarregamentoService,
    PdfCarregamentoService,
    PedidosCarregamentoService
  ],
  exports: [
    OrdemCarregamentoStatementComponent
  ]
})
export class OrdemCarregamentoModule {

}
