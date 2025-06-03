import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SelecaoLoteComponent } from './componentes/selecao-lote/selecao-lote.component';
import { FormsModule, NgControl } from '@angular/forms';


@NgModule({
  declarations: [
    SelecaoLoteComponent
  ],
  imports: [
    SharedModule,
  ],
  providers: [
  ],
  exports: [
    SelecaoLoteComponent
  ]
})
export class SapSharedModule {

}
