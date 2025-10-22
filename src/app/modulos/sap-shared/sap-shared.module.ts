import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SelecaoLoteComponent } from './componentes/selecao-lote/selecao-lote.component';
import { FormsModule, NgControl } from '@angular/forms';
import { ItemPickerComponent } from '../../sap/components/search/item-search-no-branch/item-picker.component';
import { GroupBySelectComponent } from '../../sap/components/form/select/agrupador/agrupador.select.component';
import { SearchComponent } from '../../shared/components/search/search.component';


@NgModule({
  declarations: [
    SelecaoLoteComponent,
    ItemPickerComponent,
    GroupBySelectComponent,
    SearchComponent,
  ],
  imports: [
    SharedModule,
  ],
  providers: [
  ],
  exports: [
    SelecaoLoteComponent,
    ItemPickerComponent,
    GroupBySelectComponent,
    SearchComponent,
  ]
})
export class SapSharedModule {

}
