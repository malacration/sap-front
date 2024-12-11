import { NgModule } from '@angular/core';
import { CustoMecadoriaStatementComponent } from './custo-mercadoria/custo-mercadoria.component';
import { SharedModule } from '../shared/shared.module';
import { FormacaoPrecoStatementComponent } from './formacao/formacao.component';


@NgModule({
  declarations: [
    CustoMecadoriaStatementComponent,
    FormacaoPrecoStatementComponent,
  ],
  imports: [
    SharedModule,
  ],
  providers: [
    
  ]
})
export class CalculadoraModule {

}
