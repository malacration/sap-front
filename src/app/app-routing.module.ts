import { NgModule } from '@angular/core';
import { Router, Routes, RouterModule } from '@angular/router';
import { PageNotFoundComponent } from './shared/components';
import { HomeComponent } from './home/home.component';
import { RomaneioComponent } from './sap/components/romaneio/romaneio.component';
import { RomaneioFazendaInsumoComponent } from './sap/components/romaneio-fazenda-insumo/romaneio-fazenda-insumo.component';
import { CadastroComponent } from './sap/components/cadastro/cadastro.component';
import { NovoParceiroComponent } from './sap/components/parceiro-negocio/novo-parceiro/novo-parceiro.component';
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
import { SanitizacaoContratoComponent } from './sap/components/sanitizacao-contrato/sanitizacao-contrato.component';
import { LocalidadeComponent } from './sap/components/localidade/localidade.component';
import { MapaRelacoesComponent } from './sap/components/mapa-relacoes/mapa-relacoes.component';
import { RastreioLoteComponent } from './modulos/producao/componentes/rastreio-lote/rastreio-lote.component';
import { ComissaoComponent } from './sap/components/comissao/comissao.component';
import { AutorizacaoComponent } from './sap/components/autorizacao/autorizacao.component';
import { AutorizadorComponent } from './sap/components/autorizador/autorizador.component';
import { RegraFilialComponent } from './sap/components/regra-filial/regra-filial.component';
import { LiberacaoTravaComponent } from './sap/components/liberacao-trava/liberacao-trava.component';
import { RegrasTravaComponent } from './sap/components/regras-trava/regras-trava.component';
import { AgendaEmailComponent } from './sap/components/agenda-email/agenda-email.component';
import { RegrasAcessoComponent } from './sap/components/regras-acesso/regras-acesso.component';
import { CalculadoraStatementComponent } from './modulos/calculadora-preco-venda/components/statement/statement.component';
import { ReprocessamentoComponent } from './modulos/producao/componentes/reprocessamento/repreocessamento.component';
import { OrdemProducaoListComponent } from './modulos/producao/componentes/ordem-producao/ordem-producao-list.component';
import { OrdemProducaoDetalheComponent } from './modulos/producao/componentes/ordem-producao/ordem-producao-detalhe.component';
import { ChangePassowrd } from './shared/components/change-password/change-password.component';
import { ConfigService } from './core/services/config.service';
import { PainelExpedicaoPedidosComponent } from './modulos/ordem-carregamento/componentes/painel-expedicao-pedidos/painel-expedicao-pedidos.component';
import { PainelVendasComponent } from './modulos/painel-vendas/componentes/painel-vendas/painel-vendas.component';
import { PainelVendasV2Component } from './modulos/painel-vendas/componentes/painel-vendas-v2/painel-vendas-v2.component';
import { TicketFreteComponent } from './modulos/relatorio-frete/componentes/ticket-frete/ticket-frete.component';
import { NecessidadeProducaoComponent } from './modulos/necessidade-producao/componentes/necessidade-producao/necessidade-producao.component';
import { NecessidadeProducaoDetalheComponent } from './modulos/necessidade-producao/componentes/necessidade-producao-detalhe/necessidade-producao-detalhe.component';
import { OrdemCarregamentoStatementComponent } from './modulos/ordem-carregamento/componentes/statement';
import { PixPageComponent } from './modulos/financeiro/pix-page/pix-page.component';
import { ImportacaoLancamentoComponent } from './sap/components/importacao-lancamento/importacao-lancamento.component';
import { SapLinkButtonDemoComponent } from './shared/components/sap-link-button/sap-link-button-demo.component';
import { DocumentosSapComponent } from './sap/components/documentos-sap/documentos-sap.component';
import { MeusDadosComponent } from './sap/components/meus-dados/meus-dados.component';
import { CobrancaStatementComponent } from './modulos/cobranca/componentes/cobranca-statement.component';
import { CobrancaDashboardComponent } from './modulos/cobranca/componentes/cobranca-dashboard.component';
import { OfflineHistoryComponent } from './core/offline/offline-history/offline-history.component';
import { RelatorioComponent } from './modulos/relatorio/componentes/principal/relatorio.component';
import { NotaFiscalLoteComponent } from './modulos/nota-fiscal-lote/componentes/nota-fiscal-lote.component';

 /**
  * Marcacoes do data (array): "icon:", "hidden", "internal", "role:x" (papel exigido), "role-not:x" (papel barrado)
  * e "api:metodo:/url" - a chamada principal da tela. Com a flag menuPorPermissao a tela aparece se o backend
  * disser que o usuario pode chamar essa URL (mesmas regras do filtro); o "role:" fica de reserva para quando
  * nao ha resposta. Escolha uma URL que identifique a tela, nao uma compartilhada por varias (ex.: /branch).
  * Sem "api:" de proposito: Calculadora (WebSocket), telas que o backend so
  * libera para admin (adminGuard), Romaneio e Cotacoes offline (modos de operacao proprios).
  */
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
        // Permissao so de tela: o GET /business-partners/* da logistica (cliente do carregamento) cobria /cientes.
        data: ["icon:fas fa-file-contract", "role:vendedor", "role:vendedor_admin", "role:cobranca", "api:get:/tela/clientes/parceiro-negocio",
              "usa:get:/business-partners/cientes", "usa:post:/sales-person/search"],
        canActivate: [authGuard, roleGuard],
        component: ParceiroNegocioComponent
      },
      {
        // Antes de parceiro-negocio/:cardCode, senao "novo" seria lido como CardCode
        path: 'parceiro-negocio/novo',
        title: 'Novo parceiro',
        data: ["hidden", "role:vendedor", "role:vendedor_admin", "role:cobranca", "api:post:/business-partners/novo",
              "usa:get:/state", "usa:get:/city/*", "usa:get:/forma-pagamento/liberadas", "usa:post:/sales-person/search",
              "usa:post:/locais/search"],
        canActivate: [authGuard, roleGuard],
        component: NovoParceiroComponent
      },
      {
        path: 'parceiro-negocio/:cardCode',
        title: 'Parceiro Negocio',
        data: ["hidden", "role:vendedor", "role:vendedor_admin", "role:cobranca", "api:get:/business-partners/*",
              "usa:get:/sales-person/*", "usa:get:/locais/*", "usa:post:/sales-person/search", "usa:get:/business-partners/cotacoes-parceiro",
              "usa:get:/business-partners/pedido-venda-parceiro", "usa:get:/contrato-venda-futura", "usa:post:/contrato-venda-futura/nextlink", "usa:get:/business-partners/contas-receber",
              "usa:post:/business-partners/contas-receber/nextlink", "usa:get:/invoice/cardcode/*/payment", "usa:get:/installment/*/paid", "usa:get:/tax/*/pdf",
              "usa:get:/invoice/*/parcela/*"],
        canActivate: [authGuard, roleGuard],
        component: ParceiroNegocioComponent
      },
      {
        path: 'transferencia',
        title: 'Transferências',
        data: ["icon:fas fa-exchange-alt", "role:vendedor_admin", "api:get:/sales-person/replace/*/por/*",
              "usa:post:/sales-person/search", "usa:get:/sales-person/*/business-partners"],
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
        data: ["icon:fas fa-shopping-cart", "role:vendedor", "role:vendedor_admin", "api:post:/quotation/angular",
              "usa:get:/branch", "usa:post:/business-partners/search", "usa:get:/business-partners/*", "usa:get:/locais/*",
              "usa:get:/regioes/localidade/*", "usa:get:/prazo/tabela/*", "usa:get:/forma-pagamento/filial/*/cardcode/*", "usa:post:/item/search/branch/*",
              "usa:get:/batch-stock/item-code/*/stock/*", "usa:get:/comissao/tabela/*"],
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
        data: ["icon:fas fa-file-alt", "role:vendedor", "role:vendedor_admin", "api:get:/quotation",
              "usa:get:/quotation/*", "usa:get:/sales-person/*"],
        component: CotacoesStatementComponent
      },
      {
        path: 'pedidos-venda',
        title: 'Pedidos',
        canActivate: [authGuard, roleGuard],
        component: PedidosVendaStatementComponent,
        data: ["icon:fas fa-file-signature", "role:vendedor", "role:vendedor_admin", "api:get:/pedido-venda/listar",
              "usa:get:/branch", "usa:post:/business-partners/search", "usa:post:/pedido-venda/listar/nextlink", "usa:get:/pedido-venda/raw/*",
              "usa:get:/pedido-venda/*/linhas", "usa:get:/sales-person/*", "usa:get:/pedido-venda/pix/*", "usa:get:/pix/transaction/*"],
      },
      {
        path: 'venda-futura',
        title: 'Contratos',
        data: ["icon:fas fa-file-contract", "role:vendedor", "role:vendedor_admin", "role:cobranca", "api:get:/contrato-venda-futura",
              "usa:get:/branch", "usa:post:/business-partners/search", "usa:post:/contrato-venda-futura/nextlink", "usa:get:/contrato-venda-futura/*",
              "usa:get:/contrato-venda-futura/*/produtos", "usa:get:/contrato-venda-futura/entregas/*", "usa:get:/future-sales/pedidos/*", "usa:get:/down-payment/contrato-venda-futura/*",
              "usa:get:/contrato-venda-futura/*/negociacao", "usa:get:/business-partners/*", "usa:get:/pix/transaction/*"],
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
        data: ["hidden", "icon:fas fa-project-diagram", "role:admin", "api:get:/mapa-relacoes/*/*"],
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
    title: 'Aprovações',
    canActivate: [authGuard],
    data: ["icon:fas fa-clipboard-check", "role:admin", "role:liberacao_trava"],
    path: 'aprovacoes',
    children: [
      { path: '', redirectTo: 'vendas', pathMatch: 'full' },
      {
        // Fila de documentos retidos pelo motor de regras + historico das decisoes.
        // Quem pode decidir cada motivo se cadastra em Configuracoes > Autorizadores,
        // e ONDE cada regra vale, em Configuracoes > Regras por Filial.
        path: 'vendas',
        title: 'Autorizar Vendas',
        data: ["icon:fas fa-user-check", "role:admin", "api:get:/autorizacao/pendentes"],
        canActivate: [authGuard, roleGuard],
        component: AutorizacaoComponent
      },
      {
        path: 'liberacao-trava',
        title: 'Liberação de Trava',
        data: ["icon:fas fa-unlock-alt", "role:liberacao_trava", "api:get:/trava/otp",
              "usa:get:/trava/regras"],
        canActivate: [authGuard, roleGuard],
        component: LiberacaoTravaComponent
      },
    ]
  },
  {
    title: 'Financeiro',
    path: 'financeiro',
    data: ["icon:fas fa-dollar-sign", "role:pix", "role:pix_admin", "role:cobranca", "role:vendedor", "role:vendedor_admin", "role:contabil_importacao", "role:nota_fiscal_lote"],
    canActivate: [authGuard],
    children: [
      {
        title: 'Cobrança',
        data: ["icon:fas fa-hand-holding-usd", "role:cobranca"],
        canActivate: [authGuard],
        path: 'cobranca',
        children: [
          // Sem title de propósito: o menu lateral é gerado do router e filtra por
          // route.title != undefined, então o redirect não aparece como item. Serve pra
          // /financeiro/cobranca continuar funcionando depois de a tela virar filha de um grupo.
          { path: '', redirectTo: 'titulos', pathMatch: 'full' },
          {
            path: 'titulos',
            title: 'Títulos',
            canActivate: [authGuard, roleGuard],
            // /cobranca/dominios e nao /cobranca/titulos: o vendedor tem o GET de titulos (aba do parceiro), nao a tela.
            data: ["icon:fas fa-list", "role:cobranca", "api:get:/cobranca/dominios",
                  "usa:get:/cobranca/titulos", "usa:get:/cobranca/titulos/totais", "usa:get:/cobranca/cobradores", "usa:get:/cobranca/titulos/*/*/*/historico",
                  "usa:get:/branch", "usa:post:/business-partners/search", "usa:post:/sales-person/search"],
            component: CobrancaStatementComponent
          },
          {
            path: 'resultado',
            title: 'Resultado',
            canActivate: [authGuard, roleGuard],
            data: ["icon:fas fa-chart-line", "role:cobranca", "api:get:/cobranca/dashboard",
                  "usa:get:/cobranca/dashboard/evolucao", "usa:get:/cobranca/cobradores", "usa:get:/branch", "usa:post:/sales-person/search"],
            component: CobrancaDashboardComponent
          },
        ]
      },
      {
        path: 'pix',
        title: 'PIX',
        // Permissao so de tela: o POST /pix/gerar-chave tambem gera o PIX do pedido de venda, e liberar ele nao pode
        // trazer junto a tela de PIX avulso.
        data: ["icon:fas fa-qrcode", "role:pix", "role:pix_admin", "api:get:/tela/financeiro/pix",
              "usa:post:/pix/gerar-chave", "usa:get:/branch", "usa:post:/business-partners/search"],
        canActivate: [authGuard, roleGuard],
        component: PixPageComponent,
      },
      {
        path: 'notas-fiscais',
        title: 'Notas Fiscais',
        data: ["icon:fas fa-file-invoice-dollar", "sapDocumentKind:nota-fiscal", "role:admin", "role:cobranca", "role:vendedor", "role:vendedor_admin", "api:get:/invoice",
              "usa:get:/invoice/*", "usa:get:/branch", "usa:get:/sales-person/*"],
        canActivate: [authGuard, roleGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'notas-xml-lote',
        title: 'Notas e XML em lote',
        data: ["icon:fas fa-file-archive", "role:nota_fiscal_lote", "api:get:/nota-fiscal-lote",
              "usa:get:/nota-fiscal-lote/status-sefaz", "usa:get:/nota-fiscal-lote/status-boleto", "usa:get:/nota-fiscal-lote/formas-pagamento", "usa:post:/nota-fiscal-lote/clientes/search",
              "usa:get:/branch", "usa:post:/sales-person/search"],
        canActivate: [authGuard, roleGuard],
        component: NotaFiscalLoteComponent,
      },
      {
        path: 'adiantamentos',
        title: 'Adiantamentos',
        data: ["icon:fas fa-hand-holding-usd", "sapDocumentKind:adiantamento", "role:admin", "api:get:/down-payment"],
        canActivate: [authGuard, roleGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'devolucoes',
        title: 'Devoluções',
        data: ["icon:fas fa-undo-alt", "sapDocumentKind:devolucao", "role:admin", "api:get:/credit-notes"],
        canActivate: [authGuard, roleGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'recebimentos',
        title: 'Recebimentos',
        data: ["icon:fas fa-cash-register", "sapDocumentKind:recebimento", "role:admin", "api:get:/incoming-payments"],
        canActivate: [authGuard, roleGuard],
        component: DocumentosSapComponent,
      },
      {
        path: 'importacao-lancamentos',
        title: 'Importação de Lançamentos',
        data: ["icon:fas fa-file-import", "role:contabil_importacao", "api:post:/journal/importacao/validar",
              "usa:get:/journal/importacao/historico"],
        canActivate: [authGuard, roleGuard],
        component: ImportacaoLancamentoComponent,
      },
    ]
  },
  // Cobranca foi pra dentro de Financeiro. Os redirects seguram link/favorito antigo (a query string vai junto).
  { path: 'cobranca', data: ["hidden"], redirectTo: '/financeiro/cobranca/titulos', pathMatch: 'full' },
  { path: 'cobranca/titulos', data: ["hidden"], redirectTo: '/financeiro/cobranca/titulos', pathMatch: 'full' },
  { path: 'cobranca/resultado', data: ["hidden"], redirectTo: '/financeiro/cobranca/resultado', pathMatch: 'full' },
  {
    title: 'Logística',
    canActivate: [authGuard],
    data: ["icon:fas fa-route", "role:logistica", "role:logistica_faturar"],
    path: 'logistica',
    children: [
      {
        path: 'ordem-carregamento',
        title: 'Carregamento',
        data: ["icon:fas fa-truck-ramp-box", "role:logistica", "role:logistica_faturar", "api:get:/carregamento",
              "usa:get:/carregamento/*", "usa:get:/pedido-venda/findLoadOrders", "usa:post:/pedido-venda/findAllLoadOrders", "usa:get:/carregamento/notas/*"],
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
        // Permissao so de tela: a busca de localidade tambem e filtro de outras telas (novo parceiro, analise de pedidos).
        data: ["icon:fas fa-map-marker-alt", "role:logistica", "role:logistica_faturar", "api:get:/tela/logistica/localidades",
              "usa:post:/locais/search"],
        canActivate: [authGuard, roleGuard],
        component: LocalidadeComponent
      },
    ]
  },
  {
    title: 'Produção',
    path: 'producao',
    canActivate: [authGuard],
    data: ["icon:fa-brands fa-product-hunt", "role:qualidade"],
    children: [
      // /producao era a tela de reprocessamento antes de virar grupo. Sem title, nao vira item do menu.
      { path: '', redirectTo: 'reprocessamento', pathMatch: 'full' },
      {
        path: 'reprocessamento',
        title: 'Reprocessamento',
        data: ["icon:fas fa-recycle", "role:qualidade", "api:post:/reprocessamento"],
        canActivate: [authGuard, roleGuard],
        component: ReprocessamentoComponent,
      },
      {
        path: 'ordens',
        title: 'Ordens de Produção',
        data: ["icon:fas fa-clipboard-list", "role:qualidade", "api:get:/ordens-producao",
              "usa:get:/ordens-producao/*"],
        canActivate: [authGuard, roleGuard],
        component: OrdemProducaoListComponent,
      },
      {
        path: 'rastreio-lote',
        title: 'Rastreio de Lote',
        data: ["icon:fas fa-project-diagram", "role:qualidade", "api:get:/ordens-producao/rastreio-lote",
              "usa:get:/ordens-producao/rastreio-lote/destino"],
        canActivate: [authGuard, roleGuard],
        component: RastreioLoteComponent,
      },
      {
        path: 'ordens/:id',
        title: 'Ordem de Produção',
        data: ["hidden", "role:qualidade", "api:get:/ordens-producao/*"],
        canActivate: [authGuard, roleGuard],
        component: OrdemProducaoDetalheComponent,
      },
      {
        // Documentos de uma celula, aberta pelo modal em nova aba. Fora do menu.
        path: 'necessidade-producao/detalhe',
        title: 'Necessidade de Produção - Documentos',
        data: ["hidden", "role:admin", "api:get:/relatorios/necessidade-producao/detalhe"],
        canActivate: [authGuard, roleGuard],
        component: NecessidadeProducaoDetalheComponent
      },
      {
        path: 'necessidade-producao',
        title: 'Necessidade de Produção',
        // "role:" vale com o menuPorPermissao desligado; ligado, decide o rules.yml de /relatorios/necessidade-producao.
        data: ["icon:fas fa-industry", "role:admin", "api:get:/relatorios/necessidade-producao"],
        canActivate: [authGuard, roleGuard],
        component: NecessidadeProducaoComponent
      },
    ]
  },
  {
    title: 'Relatórios',
    // Todos os papeis internos veem Relatorios; so o usuario externo nao. O que cada um ve DENTRO da tela
    // continua sendo decidido por relatorio (campo `papeis` do YAML no sap-reports).
    canActivate: [authGuard, roleGuard],
    data: ["icon:fas fa-chart-pie", "role-not:business_partner"],
    path: 'relatorios',
    children: [
      {
        path: 'painel-vendas',
        title: 'Painel de Vendas',
        // Escondido do menu (o v2 ocupou o lugar), mas com a mesma restricao de
        // papel do RBAC: some da navegacao e segue protegido por URL.
        data: ["hidden", "icon:fas fa-chart-line", "role:vendedor", "role:vendedor_admin", "api:get:/painel-vendas/mensal",
              "usa:get:/painel-vendas/mensal/*/*", "usa:get:/painel-vendas/mensal/*/*/produtos"],
        canActivate: [authGuard, roleGuard],
        component: PainelVendasComponent
      },
      {
        path: 'painel-vendas-v2',
        title: 'Painel de Vendas',
        // O grupo agora abre para todos os papeis: sem restricao aqui o item apareceria para quem o backend
        // nega (/painel-vendas/** so para vendedor e vendedor_admin), igual ao painel v1 logo acima.
        data: ["icon:fas fa-chart-area", "role:vendedor", "role:vendedor_admin", "api:get:/painel-vendas/v2/kpis",
              "usa:get:/painel-vendas/v2/evolucao", "usa:get:/branch", "usa:post:/sales-person/search"],
        canActivate: [authGuard, roleGuard],
        component: PainelVendasV2Component
      },
      {
        path: 'analise-pedidos',
        title: 'Análise Pedidos',
        // Permissao so de tela: o formulario da ordem de carregamento tambem chama GET /painel/pedidos.
        data: ["icon:fas fa-clipboard-list", "role:vendedor_admin", "role:logistica", "role:qualidade", "api:get:/tela/relatorios/analise-pedidos",
              "usa:get:/painel/pedidos", "usa:get:/branch", "usa:post:/business-partners/search", "usa:post:/sales-person/search", "usa:post:/locais/search",
              "usa:post:/item/search"],
        canActivate: [authGuard, roleGuard],
        component: PainelExpedicaoPedidosComponent
      },
      {
        path: 'calculadora',
        title: 'Calculadora',
        data: ["icon:fas fa-calculator", "role:admin", "role:calculadora"],
        canActivate: [authGuard, roleGuard],
        component: CalculadoraStatementComponent,
      },
      {
        path: 'ticket-frete',
        title: 'Ticket Médio de Frete',
        data: ["icon:fas fa-truck-moving", "role:admin", "api:get:/relatorios/frete/ticket-medio-localidade"],
        canActivate: [authGuard, roleGuard],
        component: TicketFreteComponent
      },
      {
        // Necessidade de Producao foi pro menu Producao. Os redirects seguram link/favorito antigo
        // (a query string do detalhe vai junto).
        path: 'necessidade-producao/detalhe',
        data: ["hidden"],
        redirectTo: '/producao/necessidade-producao/detalhe',
        pathMatch: 'full',
      },
      {
        path: 'necessidade-producao',
        data: ["hidden"],
        redirectTo: '/producao/necessidade-producao',
        pathMatch: 'full',
      },
      {
        path: 'relatorio',
        title: 'Relatórios',
        // Chamada do sap-reports. O sap-service nao a intercepta: a regra de acesso so decide se o item aparece no menu,
        // e o que cada um ve dentro da tela segue sendo o campo papeis do YAML de cada relatorio.
        data: ["icon:fas fa-file-alt", "api:get:/reports/api/v1/relatorios"],
        canActivate: [authGuard, roleGuard],
        component: RelatorioComponent
      },
    ]
  },
  // Sanitizacao foi pra dentro de Configuracoes. Os redirects seguram link/favorito antigo.
  { path: 'sanitizacao/cadastros', data: ["hidden"], redirectTo: '/configuracoes/sanitizacao/cadastros', pathMatch: 'full' },
  { path: 'sanitizacao/contratos', data: ["hidden"], redirectTo: '/configuracoes/sanitizacao/contratos', pathMatch: 'full' },
  {
    title: 'Configurações',
    canActivate: [authGuard],
    // So "role:admin": a Liberacao de Trava (unico item que trazia liberacao_trava pra ca)
    // virou item de Aprovacoes. Configuracoes agora so tem cadastro.
    data: ["icon:fas fa-cogs", "role:admin"],
    path: 'configuracoes',
    children: [
      {
        //rota "frete" - o componente ainda se chama RegiaoComponent (regiao),
        //que esta sendo renomeado pra Frete
        path: 'frete',
        title: 'Frete',
        data: ["icon:fas fa-map-marked-alt", "role:admin", "api:get:/regioes"],
        canActivate: [authGuard, roleGuard],
        component: RegiaoComponent
      },
      {
        path: 'frete/:code',
        title: 'Frete',
        data: ["hidden", "role:admin", "api:get:/regioes/*"],
        canActivate: [authGuard, roleGuard],
        component: RegiaoComponent
      },
      {
        path: 'comissao',
        title: 'Comissão',
        data: ["icon:fas fa-percentage", "role:admin", "api:get:/comissao"],
        canActivate: [authGuard, roleGuard],
        component: ComissaoComponent
      },
      {
        path: 'comissao/:code',
        title: 'Comissão',
        data: ["hidden", "role:admin", "api:get:/comissao/*"],
        canActivate: [authGuard, roleGuard],
        component: ComissaoComponent
      },
      {
        // A fila de documentos retidos saiu daqui pra Aprovacoes: decidir sobre um pedido
        // e trabalho do dia, nao configuracao. O redirect segura link/favorito antigo.
        path: 'autorizacoes',
        data: ["hidden"],
        redirectTo: '/aprovacoes/vendas',
        pathMatch: 'full',
      },
      {
        path: 'autorizadores',
        title: 'Autorizadores',
        data: ["icon:fas fa-user-shield", "role:admin", "api:get:/autorizador"],
        canActivate: [authGuard, roleGuard],
        component: AutorizadorComponent
      },
      {
        path: 'regras-filial',
        title: 'Regras por Filial',
        data: ["icon:fas fa-code-branch", "role:admin", "api:get:/regra-filial"],
        canActivate: [authGuard, roleGuard],
        component: RegraFilialComponent
      },
      {
        // Telas de correcao de dados em lote (previa -> aplicar). Subgrupo proprio porque vem mais.
        title: 'Sanitização',
        canActivate: [authGuard],
        data: ["icon:fas fa-broom", "role:admin"],
        path: 'sanitizacao',
        children: [
          {
            //"role:admin" tira o item do menu de quem nao e admin (MenuSidebarComponent.isRolePermitida);
            //o adminGuard barra o acesso direto pela URL, e o backend exige o papel de novo
            path: 'cadastros',
            title: 'Normalizar cadastros',
            data: ["icon:fas fa-font", "role:admin"],
            canActivate: [adminGuard],
            component: NormalizacaoCadastroComponent
          },
          {
            path: 'contratos',
            title: 'Contratos de venda futura',
            data: ["icon:fas fa-file-circle-check", "role:admin"],
            canActivate: [adminGuard],
            component: SanitizacaoContratoComponent
          },
        ]
      },
      {
        // A tela foi pro subgrupo Sanitizacao. O redirect segura link/favorito antigo.
        path: 'normalizar-cadastros',
        data: ["hidden"],
        redirectTo: '/configuracoes/sanitizacao/cadastros',
        pathMatch: 'full',
      },
      {
        // A tela foi pro subgrupo Sanitizacao. O redirect segura link/favorito antigo.
        path: 'sanitizacao-contratos',
        data: ["hidden"],
        redirectTo: '/configuracoes/sanitizacao/contratos',
        pathMatch: 'full',
      },
      {
        path: 'liberacao-trava',
        data: ["hidden"],
        redirectTo: '/aprovacoes/liberacao-trava',
        pathMatch: 'full',
      },
      {
        path: 'regras-trava',
        title: 'Regras de Trava',
        data: ["icon:fas fa-list-ul", "role:admin", "api:post:/trava/regras"],
        canActivate: [authGuard, roleGuard],
        component: RegrasTravaComponent
      },
      {
        path: 'email-inadimplencia',
        title: 'E-mail de inadimplência',
        data: ["icon:fas fa-envelope", "role:admin", "api:put:/agenda-relatorio/inadimplencia"],
        canActivate: [authGuard, roleGuard],
        component: AgendaEmailComponent
      },
      {
        // Gestao das regras de acesso (perfil -> URLs/metodos). O backend so aceita admin
        // (controller + curinga do rules); o adminGuard e so conveniencia de navegacao.
        path: 'regras-acesso',
        title: 'Regras de Acesso',
        data: ["icon:fas fa-user-lock", "role:admin"],
        canActivate: [authGuard, adminGuard],
        component: RegrasAcessoComponent
      },
    ]
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
