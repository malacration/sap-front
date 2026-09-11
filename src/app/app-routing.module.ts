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
import { adminGuard } from './core/admin.guard';
import { roleGuard } from './core/role.guard';
import { CotacoesStatementComponent } from './sap/components/marketing-document/cotacao-statement/cotacoes-statement.component';
import { VendaFuturaStatementComponent } from './sap/components/venda-futura/venda-futura-statement.component';
import { TransferenciaClientesComponent } from './sap/components/transferencia-clientes/transferencia.clientes.component';
import { PedidosVendaStatementComponent } from './sap/components/marketing-document/pedido-venda-statement/pedidos-venda-statement.component';
import { ParceiroNegocioComponent } from './sap/components/parceiro-negocio/parceiro-negocio.component';
import { RegiaoComponent } from './sap/components/regiao/regiao.component';
import { NormalizacaoCadastroComponent } from './sap/components/normalizacao-cadastro/normalizacao-cadastro.component';
import { LocalidadeComponent } from './sap/components/localidade/localidade.component';
import { MapaRelacoesComponent } from './sap/components/mapa-relacoes/mapa-relacoes.component';
import { ComissaoComponent } from './sap/components/comissao/comissao.component';
import { AutorizacaoComponent } from './sap/components/autorizacao/autorizacao.component';
import { AutorizadorComponent } from './sap/components/autorizador/autorizador.component';
import { LiberacaoTravaComponent } from './sap/components/liberacao-trava/liberacao-trava.component';
import { RegrasTravaComponent } from './sap/components/regras-trava/regras-trava.component';
import { ManageRolesComponent } from './sap/components/manage-roles/manage-roles.component';
import { AssignRoleComponent } from './sap/components/assign-role/assign-role.component';
import { CalculadoraStatementComponent } from './modulos/calculadora-preco-venda/components/statement/statement.component';
import { ReprocessamentoComponent } from './modulos/producao/componentes/reprocessamento/repreocessamento.component';
import { ChangePassowrd } from './shared/components/change-password/change-password.component';
import { ConfigService } from './core/services/config.service';
import { PainelExpedicaoPedidosComponent } from './modulos/ordem-carregamento/componentes/painel-expedicao-pedidos/painel-expedicao-pedidos.component';
import { PainelVendasComponent } from './modulos/painel-vendas/componentes/painel-vendas/painel-vendas.component';
import { TicketFreteComponent } from './modulos/relatorio-frete/componentes/ticket-frete/ticket-frete.component';
import { OrdemCarregamentoStatementComponent } from './modulos/ordem-carregamento/componentes/statement';
import { PixPageComponent } from './modulos/financeiro/pix-page/pix-page.component';
import { SapLinkButtonDemoComponent } from './shared/components/sap-link-button/sap-link-button-demo.component';
import { DocumentosSapComponent } from './sap/components/documentos-sap/documentos-sap.component';
import { MeusDadosComponent } from './sap/components/meus-dados/meus-dados.component';
import { CobrancaStatementComponent } from './modulos/cobranca/componentes/cobranca-statement.component';
import { CobrancaDashboardComponent } from './modulos/cobranca/componentes/cobranca-dashboard.component';
import { OfflineHistoryComponent } from './core/offline/offline-history/offline-history.component';

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
    data: ["icon:fas fa-users", "role:vendedor", "role:vendedor_admin", "role:cobranca"],
    canActivate: [authGuard],
    children: [
      {
        path: 'parceiro-negocio',
        title: 'Parceiro Negocio',
        data: ["icon:fas fa-file-contract", "role:vendedor", "role:vendedor_admin", "role:cobranca"],
        canActivate: [authGuard, roleGuard],
        component: ParceiroNegocioComponent
      },
      {
        path: 'parceiro-negocio/:cardCode',
        title: 'Parceiro Negocio',
        data: ["hidden", "role:vendedor", "role:vendedor_admin", "role:cobranca"],
        canActivate: [authGuard, roleGuard],
        component: ParceiroNegocioComponent
      },
      {
        path: 'transferencia',
        title: 'Transferências',
        data: ["icon:fas fa-exchange-alt", "role:vendedor_admin"],
        canActivate: [authGuard, roleGuard],
        component: TransferenciaClientesComponent
      },
    ]
  },
  {
    title: 'Venda',
    canActivate: [authGuard],
    data: ["icon:fas fa-shopping-bag", "role:vendedor", "role:vendedor_admin", "role:cobranca"],
    path: 'venda',
    children: [
      {
        path: 'document',
        title: 'Vender',
        canActivate: [authGuard, roleGuard],
        data: ["icon:fas fa-shopping-cart", "role:vendedor", "role:vendedor_admin"],
        component: DocumentStatementComponent
      },
      {
        path: 'offline',
        title: 'Cotações offline',
        canActivate: [authGuard, roleGuard],
        data: ["icon:fas fa-cloud-upload-alt", "role:vendedor", "role:vendedor_admin"],
        component: OfflineHistoryComponent
      },
      {
        path: 'cotacao',
        title: 'Cotação',
        canActivate: [authGuard, roleGuard],
        data: ["icon:fas fa-file-alt", "role:vendedor", "role:vendedor_admin"],
        component: CotacoesStatementComponent
      },
      {
        path: 'pedidos-venda',
        title: 'Pedidos',
        canActivate: [authGuard, roleGuard],
        component: PedidosVendaStatementComponent,
        data: ["icon:fas fa-file-signature", "role:vendedor", "role:vendedor_admin"],
      },
      {
        path: 'venda-futura',
        title: 'Contratos',
        data: ["icon:fas fa-file-contract", "role:vendedor", "role:vendedor_admin", "role:cobranca"],
        canActivate: [authGuard, roleGuard],
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
        data: ["hidden", "icon:fas fa-project-diagram", "role:admin"],
        canActivate: [authGuard, roleGuard],
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
    data: ["icon:fas fa-chart-pie", "role:vendedor", "role:vendedor_admin", "role:logistica", "role:qualidade"],
    path: 'relatorios',
    children: [
      {
        path: 'painel-vendas',
        title: 'Painel de Vendas',
        data: ["icon:fas fa-chart-line", "role:vendedor", "role:vendedor_admin"],
        canActivate: [authGuard, roleGuard],
        component: PainelVendasComponent
      },
      {
        path: 'analise-pedidos',
        title: 'Análise Pedidos',
        data: ["icon:fas fa-clipboard-list", "role:vendedor_admin", "role:logistica", "role:qualidade"],
        canActivate: [authGuard, roleGuard],
        component: PainelExpedicaoPedidosComponent
      },
      {
        path: 'calculadora',
        title: 'Calculadora',
        data: ["icon:fas fa-calculator", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: CalculadoraStatementComponent,
      },
      {
        path: 'ticket-frete',
        title: 'Ticket Médio de Frete',
        data: ["icon:fas fa-truck-moving", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: TicketFreteComponent
      },
    ]
  },
  {
    title: 'Logística',
    canActivate: [authGuard],
    data: ["icon:fas fa-route", "role:logistica", "role:logistica_faturar"],
    path: 'logistica',
    children: [
      {
        path: 'ordem-carregamento',
        title: 'Carregamento',
        data: ["icon:fas fa-truck-ramp-box", "role:logistica", "role:logistica_faturar"],
        canActivate: [authGuard, roleGuard],
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
        data: ["icon:fas fa-map-marker-alt", "role:logistica", "role:logistica_faturar"],
        canActivate: [authGuard, roleGuard],
        component: LocalidadeComponent
      },
    ]
  },
  {
    title: 'Configurações',
    canActivate: [authGuard],
    data: ["icon:fas fa-cogs", "role:admin", "role:liberacao_trava"],
    path: 'configuracoes',
    children: [
      {
        //rota "frete" - o componente ainda se chama RegiaoComponent (regiao),
        //que esta sendo renomeado pra Frete
        path: 'frete',
        title: 'Frete',
        data: ["icon:fas fa-map-marked-alt", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: RegiaoComponent
      },
      {
        path: 'frete/:code',
        title: 'Frete',
        data: ["hidden", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: RegiaoComponent
      },
      {
        path: 'comissao',
        title: 'Comissão',
        data: ["icon:fas fa-percentage", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: ComissaoComponent
      },
      {
        path: 'comissao/:code',
        title: 'Comissão',
        data: ["hidden", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: ComissaoComponent
      },
      {
        path: 'autorizacoes',
        title: 'Autorizações',
        data: ["icon:fas fa-user-check", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: AutorizacaoComponent
      },
      {
        path: 'autorizadores',
        title: 'Autorizadores',
        data: ["icon:fas fa-user-shield", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: AutorizadorComponent
      },
      {
        //"role:admin" tira o item do menu de quem nao e admin (MenuSidebarComponent.isRolePermitida);
        //o adminGuard barra o acesso direto pela URL, e o backend exige o papel de novo
        path: 'normalizar-cadastros',
        title: 'Normalizar cadastros',
        data: ["icon:fas fa-font", "role:admin"],
        canActivate: [adminGuard],
        component: NormalizacaoCadastroComponent
      },
      {
        path: 'liberacao-trava',
        title: 'Liberação de Trava',
        data: ["icon:fas fa-unlock-alt", "role:liberacao_trava"],
        canActivate: [authGuard, roleGuard],
        component: LiberacaoTravaComponent
      },
      {
        path: 'regras-trava',
        title: 'Regras de Trava',
        data: ["icon:fas fa-list-ul", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: RegrasTravaComponent
      },
    ]
  },
  {
    title: 'Cobrança',
    data: ["icon:fas fa-hand-holding-usd", "role:cobranca"],
    canActivate: [authGuard],
    path: 'cobranca',
    children: [
      // Sem title de propósito: o menu lateral é gerado do router e filtra por
      // route.title != undefined, então o redirect não aparece como item. Serve pra
      // /cobranca continuar funcionando depois de a tela virar filha de um grupo.
      { path: '', redirectTo: 'titulos', pathMatch: 'full' },
      {
        path: 'titulos',
        title: 'Títulos',
        canActivate: [authGuard, roleGuard],
        data: ["icon:fas fa-list", "role:cobranca"],
        component: CobrancaStatementComponent
      },
      {
        path: 'resultado',
        title: 'Resultado',
        canActivate: [authGuard, roleGuard],
        data: ["icon:fas fa-chart-line", "role:cobranca"],
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
    data: ["icon:fas fa-dollar-sign", "role:pix", "role:pix_admin", "role:cobranca", "role:vendedor", "role:vendedor_admin"],
    canActivate: [authGuard],
    children: [
      {
        path: 'pix',
        title: 'PIX',
        data: ["icon:fas fa-qrcode", "role:pix", "role:pix_admin"],
        canActivate: [authGuard, roleGuard],
        component: PixPageComponent,
      },
      {
        path: 'notas-fiscais',
        title: 'Notas Fiscais',
        data: ["icon:fas fa-file-invoice-dollar", "sapDocumentKind:nota-fiscal", "role:admin", "role:cobranca", "role:vendedor", "role:vendedor_admin"],
        canActivate: [authGuard, roleGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'adiantamentos',
        title: 'Adiantamentos',
        data: ["icon:fas fa-hand-holding-usd", "sapDocumentKind:adiantamento", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'devolucoes',
        title: 'Devoluções',
        data: ["icon:fas fa-undo-alt", "sapDocumentKind:devolucao", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'recebimentos',
        title: 'Recebimentos',
        data: ["icon:fas fa-cash-register", "sapDocumentKind:recebimento", "role:admin"],
        canActivate: [authGuard, roleGuard],
        component: DocumentosSapComponent,
      },
    ]
  },
  {
    title: 'Produção',
    path: 'producao',
    data: ["icon:fa-brands fa-product-hunt", "role:qualidade"],
    canActivate: [authGuard, roleGuard],
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
