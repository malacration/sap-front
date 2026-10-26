import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { NecessidadeProducaoComponent } from './componentes/necessidade-producao/necessidade-producao.component';
import { NecessidadeProducaoDetalheComponent } from './componentes/necessidade-producao-detalhe/necessidade-producao-detalhe.component';
import { NecessidadeProducaoDocumentosComponent } from './componentes/necessidade-producao-documentos/necessidade-producao-documentos.component';

@NgModule({
  declarations: [NecessidadeProducaoComponent, NecessidadeProducaoDetalheComponent, NecessidadeProducaoDocumentosComponent],
  imports: [CommonModule, FormsModule, SharedModule],
  exports: [NecessidadeProducaoComponent, NecessidadeProducaoDetalheComponent],
})
export class NecessidadeProducaoModule {}
