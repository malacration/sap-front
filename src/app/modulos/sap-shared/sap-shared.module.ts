import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SelecaoLoteComponent } from './componentes/selecao-lote/selecao-lote.component';
import { ItemPickerComponent } from '../../sap/components/search/item-search-no-branch/item-picker.component';
import { GroupBySelectComponent } from '../../sap/components/form/select/agrupador/agrupador.select.component';
import { SearchComponent } from '../../shared/components/search/search.component';
import { BatchStockService } from './_services/BatchStockService';
import { BusinessPartnerService } from './_services/business-partners.service';
import { TransportadoraSearchComponent } from './componentes/transportadora-search/transportadora-search.component';
import { LocalidadeService } from './_services/localidade.service';
import { OrderSalesService } from './_services/documents/order-sales.service';
import { BranchSelectComponent } from './componentes/branch/branch-select.component';
import { LocalidadeSearchComponent } from './componentes/localidade-search/localidade-search.component';
import { BusinesPartnerSearchComponent } from './componentes/busines-partner-search/busines-partner-search.component';
import { SalesPersonSearchComponent } from './componentes/sales-person-search/sales-person-search.component';


@NgModule({
  declarations: [
    SelecaoLoteComponent,
    ItemPickerComponent,
    GroupBySelectComponent,
    TransportadoraSearchComponent,
    BranchSelectComponent,
    LocalidadeSearchComponent,
    BusinesPartnerSearchComponent,
    SalesPersonSearchComponent,
  ],
  imports: [
    SharedModule,
  ],
  providers: [
    BatchStockService,
    BusinessPartnerService,
    LocalidadeService,
    OrderSalesService,
  ],
  exports: [
    SelecaoLoteComponent,
    ItemPickerComponent,
    GroupBySelectComponent,
    TransportadoraSearchComponent,
    BranchSelectComponent,
    LocalidadeSearchComponent,
    BusinesPartnerSearchComponent,
    SalesPersonSearchComponent
  ]
})
export class SapSharedModule {

}
