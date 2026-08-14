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
import { PixLinkComponent } from './shared/components/pix-link/pix-link.component';
import { authGuard } from './core/auth.guard';
import { CotacoesStatementComponent } from './sap/components/marketing-document/cotacao-statement/cotacoes-statement.component';
import { VendaFuturaStatementComponent } from './sap/components/venda-futura/venda-futura-statement.component';
import { TransferenciaClientesComponent } from './sap/components/transferencia-clientes/transferencia.clientes.component';
import { PedidosVendaStatementComponent } from './sap/components/marketing-document/pedido-venda-statement/pedidos-venda-statement.component';
import { ParceiroNegocioComponent } from './sap/components/parceiro-negocio/parceiro-negocio.component';
import { RegiaoComponent } from './sap/components/regiao/regiao.component';
import { LocalidadeComponent } from './sap/components/localidade/localidade.component';
import { MapaRelacoesComponent } from './sap/components/mapa-relacoes/mapa-relacoes.component';
import { ComissaoComponent } from './sap/components/comissao/comissao.component';
import { AutorizacaoComponent } from './sap/components/autorizacao/autorizacao.component';
import { AutorizadorComponent } from './sap/components/autorizador/autorizador.component';
import { ManageRolesComponent } from './sap/components/manage-roles/manage-roles.component';
import { AssignRoleComponent } from './sap/components/assign-role/assign-role.component';
import { CalculadoraStatementComponent } from './modulos/calculadora-preco-venda/components/statement/statement.component';
import { ReprocessamentoComponent } from './modulos/producao/componentes/reprocessamento/repreocessamento.component';
import { ChangePassowrd } from './shared/components/change-password/change-password.component';
import { ConfigService } from './core/services/config.service';
import { PainelExpedicaoPedidosComponent } from './modulos/ordem-carregamento/componentes/painel-expedicao-pedidos/painel-expedicao-pedidos.component';
import { PainelVendasComponent } from './modulos/painel-vendas/componentes/painel-vendas/painel-vendas.component';
import { OrdemCarregamentoStatementComponent } from './modulos/ordem-carregamento/componentes/statement';
import { PixPageComponent } from './modulos/financeiro/pix-page/pix-page.component';
import { SapLinkButtonDemoComponent } from './shared/components/sap-link-button/sap-link-button-demo.component';
import { DocumentosSapComponent } from './sap/components/documentos-sap/documentos-sap.component';
import { MeusDadosComponent } from './sap/components/meus-dados/meus-dados.component';
import { CobrancaStatementComponent } from './modulos/cobranca/componentes/cobranca-statement.component';
import { CobrancaDashboardComponent } from './modulos/cobranca/componentes/cobranca-dashboard.component';

 let routes: Routes = [
  {
    path: '',
    redirectTo: 'faturas',
    pathMatch: 'full',
  },
  {
    path: 'change-passowrd',
    title: 'Trocar Senha',
    data: ["hidden"],
    component: ChangePassowrd
  },
  {
    path: 'meus-dados',
    title: 'Meus Dados',
    data: ["hidden"],
    component: MeusDadosComponent
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
    path: 'pix-link',
    title: 'Pagamento PIX',
    data: ["hidden", "public"],
    component: PixLinkComponent
  },
  {
    path: 'demo/sap-link-button',
    title: 'Demo SAP Link Button',
    data: ["hidden"],
    component: SapLinkButtonDemoComponent
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
        data: ["hidden"],
        redirectTo: '/relatorios/analise-pedidos',
        pathMatch: 'full',
      },
      {
        path: 'painel-vendas',
        data: ["hidden"],
        redirectTo: '/relatorios/painel-vendas',
        pathMatch: 'full',
      },
      {
        path: 'mapa-relacoes',
        title: 'Mapa de Relações',
        data: ["hidden", "icon:fas fa-project-diagram"],
        canActivate: [authGuard],
        component: MapaRelacoesComponent
      },
      {
        path: 'comissao',
        data: ["hidden"],
        redirectTo: '/configuracoes/comissao',
        pathMatch: 'full',
      },
      {
        path: 'comissao/:code',
        data: ["hidden"],
        redirectTo: '/configuracoes/comissao/:code',
        pathMatch: 'full',
      },
    ]
  },
  {
    title: 'Relatórios',
    canActivate: [authGuard],
    data: ["icon:fas fa-chart-pie"],
    path: 'relatorios',
    children: [
      {
        path: 'painel-vendas',
        title: 'Painel de Vendas',
        data: ["icon:fas fa-chart-line"],
        canActivate: [authGuard],
        component: PainelVendasComponent
      },
      {
        path: 'analise-pedidos',
        title: 'Análise Pedidos',
        data: ["icon:fas fa-clipboard-list"],
        canActivate: [authGuard],
        component: PainelExpedicaoPedidosComponent
      },
      {
        path: 'calculadora',
        title: 'Calculadora',
        data: ["icon:fas fa-calculator"],
        canActivate: [authGuard],
        component: CalculadoraStatementComponent,
      },
    ]
  },
  {
    title: 'Logística',
    canActivate: [authGuard],
    data: ["icon:fas fa-route"],
    path: 'logistica',
    children: [
      {
        path: 'ordem-carregamento',
        title: 'Carregamento',
        data: ["icon:fas fa-truck-ramp-box"],
        canActivate: [authGuard],
        component: OrdemCarregamentoStatementComponent
      },
      {
        path: 'frete',
        data: ["hidden"],
        redirectTo: '/configuracoes/frete',
        pathMatch: 'full',
      },
      {
        path: 'frete/:code',
        data: ["hidden"],
        redirectTo: '/configuracoes/frete/:code',
        pathMatch: 'full',
      },
      {
        path: 'localidades',
        title: 'Localidades',
        data: ["icon:fas fa-map-marker-alt"],
        canActivate: [authGuard],
        component: LocalidadeComponent
      },
    ]
  },
  {
    title: 'Configurações',
    canActivate: [authGuard],
    data: ["icon:fas fa-cogs"],
    path: 'configuracoes',
    children: [
      {
        //rota "frete" - o componente ainda se chama RegiaoComponent (regiao),
        //que esta sendo renomeado pra Frete
        path: 'frete',
        title: 'Frete',
        data: ["icon:fas fa-map-marked-alt"],
        canActivate: [authGuard],
        component: RegiaoComponent
      },
      {
        path: 'frete/:code',
        title: 'Frete',
        data: ["hidden"],
        canActivate: [authGuard],
        component: RegiaoComponent
      },
      {
        path: 'comissao',
        title: 'Comissão',
        data: ["icon:fas fa-percentage"],
        canActivate: [authGuard],
        component: ComissaoComponent
      },
      {
        path: 'comissao/:code',
        title: 'Comissão',
        data: ["hidden"],
        canActivate: [authGuard],
        component: ComissaoComponent
      },
      {
        path: 'autorizacoes',
        title: 'Autorizações',
        data: ["icon:fas fa-user-check"],
        canActivate: [authGuard],
        component: AutorizacaoComponent
      },
      {
        path: 'autorizadores',
        title: 'Autorizadores',
        data: ["icon:fas fa-user-shield"],
        canActivate: [authGuard],
        component: AutorizadorComponent
      },
    ]
  },
  {
    title: 'Cobrança',
    data: ["icon:fas fa-hand-holding-usd"],
    path: 'cobranca',
    children: [
      // Sem title de propósito: o menu lateral é gerado do router e filtra por
      // route.title != undefined, então o redirect não aparece como item. Serve pra
      // /cobranca continuar funcionando depois de a tela virar filha de um grupo.
      { path: '', redirectTo: 'titulos', pathMatch: 'full' },
      {
        path: 'titulos',
        title: 'Títulos',
        canActivate: [authGuard],
        data: ["icon:fas fa-list"],
        component: CobrancaStatementComponent
      },
      {
        path: 'resultado',
        title: 'Resultado',
        canActivate: [authGuard],
        data: ["icon:fas fa-chart-line"],
        component: CobrancaDashboardComponent
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
    title: 'Financeiro',
    path: 'financeiro',
    data: ["icon:fas fa-dollar-sign"],
    canActivate: [authGuard],
    children: [
      {
        path: 'pix',
        title: 'PIX',
        data: ["icon:fas fa-qrcode"],
        canActivate: [authGuard],
        component: PixPageComponent,
      },
      {
        path: 'notas-fiscais',
        title: 'Notas Fiscais',
        data: ["icon:fas fa-file-invoice-dollar", "sapDocumentKind:nota-fiscal"],
        canActivate: [authGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'adiantamentos',
        title: 'Adiantamentos',
        data: ["icon:fas fa-hand-holding-usd", "sapDocumentKind:adiantamento"],
        canActivate: [authGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'devolucoes',
        title: 'Devoluções',
        data: ["icon:fas fa-undo-alt", "sapDocumentKind:devolucao"],
        canActivate: [authGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'recebimentos',
        title: 'Recebimentos',
        data: ["icon:fas fa-cash-register", "sapDocumentKind:recebimento"],
        canActivate: [authGuard],
        component: DocumentosSapComponent,
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
    path: 'statement-calc',
    data: ["hidden"],
    redirectTo: '/relatorios/calculadora',
    pathMatch: 'full',
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
