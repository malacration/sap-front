import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SapSharedModule } from '../sap-shared/sap-shared.module';
import { ParametroCadastroComponent } from './componentes/parametro-cadastro/parametro-cadastro.component';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { NgxPaginationModule } from 'ngx-pagination';
import { RelatorioAutoriaComponent } from './componentes/autoria/relatorio-autoria.component';
import { FormularioParametrosComponent } from './componentes/formulario-parametros/formulario-parametros.component';
import { RelatorioTokensComponent } from './componentes/tokens/relatorio-tokens.component';
import { RelatorioConsumoComponent } from './componentes/consumo/relatorio-consumo.component';
import { EditorCodigoComponent } from './componentes/editor-codigo/editor-codigo.component';
import { RelatorioComponent } from './componentes/principal/relatorio.component';
import { NgxDropzoneCompatComponent } from './componentes/upload/ngx-dropzone-compat.component';

@NgModule({
  declarations: [
    ParametroCadastroComponent,
    RelatorioComponent,
    RelatorioConsumoComponent,
    RelatorioAutoriaComponent,
    EditorCodigoComponent,
    NgxDropzoneCompatComponent,
    RelatorioTokensComponent,
    FormularioParametrosComponent,
  ],
  imports: [
    SharedModule,
    SapSharedModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgxPaginationModule,
    TabsModule.forRoot(),
    ModalModule.forRoot(),
  ],
  exports: [RelatorioComponent],
})
export class RelatorioModule {}
