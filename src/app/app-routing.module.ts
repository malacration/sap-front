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
import { PedidosVendaStatementComponent } from './sap/components/marketing-document/pedido-venda-statement/pedidos-venda-statement.component';
import { ParceiroNegocioComponent } from './sap/components/parceiro-negocio/parceiro-negocio.component';
import { ManageRolesComponent } from './sap/components/manage-roles/manage-roles.component';
import { AssignRoleComponent } from './sap/components/assign-role/assign-role.component';
import { CustoMecadoriaStatementComponent } from './calculadora-preco-venda/components/custo-mercadoria/custo-mercadoria.component';
import { CalculadoraStatementComponent } from './calculadora-preco-venda/components/statement/statement.component';
import { SelecaoProdutoComponent } from './calculadora-preco-venda/components/selecao-produto/selecao-produto.component';
import { FormacaoPrecoStatementComponent } from './calculadora-preco-venda/components/formacao/formacao.component';

 let routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    title: 'Inicio',
    data: ["icon:fas fa-home"],
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
    data: ["icon:fas fa-file-invoice"],
    component: FaturasComponent
  },
  {
    path: 'cadastro/:id',
    title: 'Cadastro',
    data: ["internal","hidden"],
    component: CadastroComponent
  },
  {
    path: 'clientes',
    title: 'Clientes',
    data: ["icon:fas fa-users"],
    canActivate: [authGuard],
    children: [ 
      {
        path: 'parceiro-negocio',
        title: 'Parceiro Negocio',
        data: ["icon:fas fa-file-contract"],
        canActivate: [authGuard],
        component: ParceiroNegocioComponent
      },
      {
        path: 'parceiro-negocio/:cardCode',
        title: 'Parceiro Negocio',
        data: ["hidden"],
        canActivate: [authGuard],
        component: ParceiroNegocioComponent
      },
      {
        path: 'transferencia',
        title: 'Transferências',
        data: ["icon:fas fa-exchange-alt"],
        canActivate: [authGuard],
        component: TransferenciaClientesComponent
      },
    ]
  },
  {
    title: 'Venda',
    canActivate: [authGuard],
    data: ["icon:fas fa-shopping-bag"],
    path: 'venda',
    children: [ 
      {
        path: 'document',
        title: 'Vender',
        canActivate: [authGuard],
        data: ["icon:fas fa-shopping-cart"],
        component: DocumentStatementComponent
      },
      {
        path: 'cotacao',
        title: 'Cotação',
        canActivate: [authGuard],
        data: ["icon:fas fa-file-alt"],
        component: CotacoesStatementComponent
      },
      {
        path: 'pedidos-venda',
        title: 'Pedidos',
        canActivate: [authGuard],
        component: PedidosVendaStatementComponent,
        data: ["icon:fas fa-file-signature"],
      },
      {
        path: 'venda-futura',
        title: 'Contratos',
        data: ["icon:fas fa-file-contract"],
        canActivate: [authGuard],
        component: VendaFuturaStatementComponent
      },
    ]
  },
  {
    title: 'Administrador',
    canActivate: [authGuard],
    data: ["hidden","icon:fas fa-cog"],
    path: 'roles',
    children: [ 
      {
        path: 'manage-roles',
        title: 'Roles',
        data: ["icon:fas fa-users"],
        canActivate: [authGuard],
        component: ManageRolesComponent
      },
      {
        path: 'assign-role',
        title: 'Atribuicao',
        data: ["icon:fas fa-user-check"],
        canActivate: [authGuard],
        component: AssignRoleComponent
      },
    ]
  },
  {
    title: 'Calculadora',
    path: 'statment-calc',
    component: CalculadoraStatementComponent,
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
