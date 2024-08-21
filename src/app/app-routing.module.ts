import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PageNotFoundComponent } from './shared/components';
import { HomeComponent } from './home/home.component';
import { RomaneioComponent } from './sap/components/romaneio/romaneio.component';
import { RomaneioFazendaInsumoComponent } from './sap/components/romaneio-fazenda-insumo/romaneio-fazenda-insumo.component';
import { CadastroComponent } from './sap/components/cadastro/cadastro.component';
import { FaturasComponent } from './sap/components/faturas/faturas.component';
import { DocumentStatementComponent } from './sap/components/document/documento.statement.component';
import { LoginComponent } from './shared/components/login/login.component';
import { authGuard } from './core/auth.guard';
import { CotacoesStatementComponent } from './sap/components/marketing-document/cotacao-statement/cotacoes-statement.component';
import { VendaFuturaStatementComponent } from './sap/components/venda-futura/venda-futura-statement.component';
import { TransferenciaClientesComponent } from './sap/components/transferencia-clientes/transferencia.clientes.component';

 let routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    title: 'Inicio',
    component: HomeComponent
  },
  {
    path: 'login',
    title: 'Login',
    data: ["hidden"],
    component: LoginComponent
  },
  {
    path: 'romaneio',
    title: 'Romaneio',
    data: ["internal"],
    component: RomaneioComponent
  },
  {
    path: 'romaneio-fazenda-insumo/:id/:tipo',
    title: 'Romaneio Fazenda Insumo',
    data: ["hidden"],
    component: RomaneioFazendaInsumoComponent
  },
  {
    path: 'faturas',
    title: 'Faturas',
    component: FaturasComponent
  },
  {
    path: 'transferencia-clientes',
    title: 'Transferencia de Clientes',
    canActivate: [authGuard],
    component: TransferenciaClientesComponent
  },
  {
    path: 'cadastro/:id',
    title: 'Cadastro',
    data: ["internal","hidden"],
    component: CadastroComponent
  },
  {
    title: 'Venda',
    canActivate: [authGuard],
    path: 'venda',
    children: [ 
      {
        path: 'document',
        title: 'Vender',
        canActivate: [authGuard],
        data: ["internal","hidden","icon:far fa-shopping-cart"],
        component: DocumentStatementComponent
      },
      {
        path: 'cotacao',
        title: 'Cotação',
        canActivate: [authGuard],
        component: CotacoesStatementComponent
      },
      {
        path: 'pedidos',
        title: 'Pedidos',
        canActivate: [authGuard],
        component: CotacoesStatementComponent
      },
      {
        path: 'venda-futura',
        title: 'Contratos',
        canActivate: [authGuard],
        component: VendaFuturaStatementComponent
      },
    ]
  },
  
  {
    path: '**',
    title: 'Não encontrado',
    data: ["hidden"],
    component: PageNotFoundComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
