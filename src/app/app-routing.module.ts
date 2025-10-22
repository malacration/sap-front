import { NgModule } from '@angular/core';
import { Router, Routes, RouterModule } from '@angular/router';
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
import { CalculadoraStatementComponent } from './modulos/calculadora-preco-venda/components/statement/statement.component';
import { ReprocessamentoComponent } from './modulos/producao/componentes/reprocessamento/repreocessamento.component';
import { ChangePassowrd } from './shared/components/change-password/change-password.component';
import { OrdemCarregamentoComponent } from './sap/components/ordem-carregamento/ordem-carregamento.component';
import { OrdemCarregamentoStatementComponent } from './sap/components/detalhes-ordem-carregamento/ordem-carregamento-statement.component';
import { ConfigService } from './core/services/config.service';
import { PainelExpedicaoPedidosComponent } from './sap/components/painel-expedicao-pedidos/painel-expedicao-pedidos.component';

 let routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'change-passowrd',
    title: 'Trocar Senha',
    data: ["hidden"],
    component: ChangePassowrd
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
      {
        path: 'analise-pedidos ',
        title: 'Análise Pedidos ',
        canActivate: [authGuard],
        component: PainelExpedicaoPedidosComponent
      },
    ]
  },
  {
    title: 'Carregamento',
    canActivate: [authGuard],
    data: ["icon:fas fa-truck"],
    path: 'ordem-carregamento',
    children: [ 
      {
        path: 'ordem',
        title: 'Ordem',
        data: ["icon:fas fa-box"],
        canActivate: [authGuard],
        component: OrdemCarregamentoComponent
      },
      {
        path: 'detalhes',
        title: 'Detalhes',
        data: ["icon:fas fa-file-alt"],
        canActivate: [authGuard],
        component: OrdemCarregamentoStatementComponent
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
    title: 'Produção',
    path: 'producao',
    data: ["icon:fa-brands fa-product-hunt"],
    component: ReprocessamentoComponent,
  },
  {
    title: 'Calculadora',
    path: 'statement-calc',
    component: CalculadoraStatementComponent,
  },
  {
    path: 'ordem-carregamento/:id',
    title: 'Editar Ordem de Carregamento',
    data: ["hidden"],
    component: OrdemCarregamentoComponent,
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
export class AppRoutingModule {
  private readonly defaultHiddenPaths = new Set<string>();

  constructor(private router: Router, private configService: ConfigService) {
    this.collectDefaultHiddenPaths(routes);
    this.applyToggleFeatures();
  }

  private applyToggleFeatures(): void {
    const disabledPaths = new Set(this.configService.disableTogglefeature ?? []);
    const updatedConfig = this.updateHiddenFlags(
      this.router.config,
      disabledPaths
    );
    this.router.resetConfig(updatedConfig);
  }

  private updateHiddenFlags(
    routesConfig: Routes,
    disabledPaths: Set<string>,
    parentPath: string = ''
  ): Routes {
    routesConfig.forEach((route) => {
      const routePath = route.path ?? '';
      const fullPath =
        parentPath && routePath
          ? `${parentPath}/${routePath}`
          : parentPath || routePath;
      const shouldHide =
        disabledPaths.has(routePath) ||
        (fullPath ? disabledPaths.has(fullPath) : false);
      const isDefaultHidden =
        this.defaultHiddenPaths.has(routePath) ||
        (fullPath ? this.defaultHiddenPaths.has(fullPath) : false);

      if (Array.isArray(route.data)) {
        const entries = [...route.data];
        const hasHidden = entries.includes('hidden');

        if (shouldHide && !hasHidden) {
          entries.push('hidden');
          route.data = entries;
        } else if (!shouldHide && hasHidden && !isDefaultHidden) {
          route.data = entries.filter((entry) => entry !== 'hidden');
        } else if (shouldHide && hasHidden) {
          route.data = entries;
        }
      } else if (route.data === undefined && shouldHide) {
        route.data = ['hidden'];
      } else if (route.data && !Array.isArray(route.data)) {
        // leave non-array data untouched
      }

      if (route.children) {
        this.updateHiddenFlags(route.children, disabledPaths, fullPath);
      }
    });

    return routesConfig;
  }

  private collectDefaultHiddenPaths(
    routesConfig: Routes,
    parentPath: string = ''
  ): void {
    routesConfig.forEach((route) => {
      const routePath = route.path ?? '';
      const fullPath =
        parentPath && routePath
          ? `${parentPath}/${routePath}`
          : parentPath || routePath;

      if (Array.isArray(route.data) && route.data.includes('hidden')) {
        if (routePath) {
          this.defaultHiddenPaths.add(routePath);
        }
        if (fullPath) {
          this.defaultHiddenPaths.add(fullPath);
        }
      }

      if (route.children) {
        this.collectDefaultHiddenPaths(route.children, fullPath);
      }
    });
  }
}
