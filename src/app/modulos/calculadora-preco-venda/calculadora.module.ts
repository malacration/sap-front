import { NgModule } from '@angular/core';
import { CustoMecadoriaStatementComponent } from './components/custo-mercadoria/custo-mercadoria.component';
import { FormacaoPrecoStatementComponent } from './components/formacao/formacao.component';
import { SelecaoProdutoComponent } from './components/selecao-produto/selecao-produto.component';
import { CalculadoraStatementComponent } from './components/statement/statement.component';
import { SharedModule } from '../../shared/shared.module';
import { CalculadoraPdfComponent } from './components/calculadora-pdf/calculadora-pdf.component';


@NgModule({
  declarations: [
    CustoMecadoriaStatementComponent,
    FormacaoPrecoStatementComponent,
    SelecaoProdutoComponent,
    CalculadoraStatementComponent,
    CalculadoraPdfComponent,
  ],
  imports: [
    SharedModule
  ],
  providers: [
    
  ]
})
export class CalculadoraModule {

}
