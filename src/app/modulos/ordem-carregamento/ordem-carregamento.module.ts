import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { OrdemCarregamentoStatementComponent } from './componentes/statement';
import { OrdemCarregamentoService } from './service/ordem-carregamento.service';
import { CommonModule } from '@angular/common';
import { ListComponent } from './componentes/list/list';
import { OrdemCarregamentoSelectedComponent } from './componentes/selected/selected';
import { PdfCarregamentoService } from './service/pdf-carregamento.service';
import { PainelExpedicaoPedidosComponent } from './componentes/painel-expedicao-pedidos/painel-expedicao-pedidos.component';
import { DualListBoxComponent } from './componentes/dual-list-box/dual-list-box.component';
import { FormularioComponent } from './componentes/formulario/formulario.component';
import { SelecaoLotesModalComponent } from './modals/selecao-lotes-modal/selecao-lotes-modal.component';
import { SelecaoLotesModalPedidoComponent } from './modals/selecao-lotes-modal-pedido/selecao-lotes-modal-pedido.component';
import { ItinerarioModalComponent } from './modals/itinerario-modal/itinerario-modal.component';
import { IncotermsSelectComponent } from '../../sap/components/form/select/incoterms/incoterms.select.component';
import { EmOrdemDeCarregamentoSelectComponent } from '../../sap/components/form/select/em-ordem-de-carregamento/em-ordem-de-carregamento.select.component';
import { OrdemCarregamentoPdfService } from './ordem-carregamento-pdf/ordem-carregamento-pdf.component';
import { RomaneioPdfService } from './componentes/romaneio-pdf/romaneio-pdf.component';
import { ItinerarioPdfService } from './componentes/itinerario-pdf.component/itinerario-pdf.component';


@NgModule({
  declarations: [
    OrdemCarregamentoStatementComponent,
    OrdemCarregamentoSelectedComponent,
    ListComponent,
    PainelExpedicaoPedidosComponent,
    DualListBoxComponent,
    FormularioComponent,
    SelecaoLotesModalComponent,
    SelecaoLotesModalPedidoComponent,
    ItinerarioModalComponent,
    IncotermsSelectComponent,
    EmOrdemDeCarregamentoSelectComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    SapSharedModule
  ],
  providers: [
    OrdemCarregamentoService,
    PdfCarregamentoService,
    OrdemCarregamentoPdfService,
    RomaneioPdfService,
    ItinerarioPdfService
  ],
  exports: [
    OrdemCarregamentoStatementComponent
  ]
})
export class OrdemCarregamentoModule {

}
