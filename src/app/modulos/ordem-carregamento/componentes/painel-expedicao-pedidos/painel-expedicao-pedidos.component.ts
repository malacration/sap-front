import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import moment from 'moment';

import { Branch } from '../../../../sap/model/branch';
import { SalesPerson } from '../../../../sap/model/sales-person/sales-person';
import { BusinessPartner } from '../../../../sap/model/business-partner/business-partner';
import { Item } from '../../../../sap/model/item';
import { Column } from '../../../../shared/components/table/column.model';
import { Page } from '../../../../sap/model/page.model';
import { NextLinkService } from '../../../../sap/service/nextLink.service';
import { PainelExpedicaoPedidos } from '../../../../sap/model/painel-expedicao-pedidos.model';
import { Localidade } from '../../../../sap/model/localidade/localidade';
import { PainelExpedicaoPedidosService, PainelExpedicaoTotais } from '../../service/pedidos-carregamento.service';

@Component({
    selector: 'painel-expedicao-pedidos',
    templateUrl: './painel-expedicao-pedidos.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PainelExpedicaoPedidosComponent implements OnInit, OnDestroy {
  startDate = '';
  endDate = '';
  carregando = false;
  private loadingStart: number | null = null;
  elapsedSeconds = 0;
  private loadingTimer: any;

  resultado: Page<PainelExpedicaoPedidos> = {
    content: [],
    nextLink: null,
    totalElements: 0,
    size: 0,
  };
  readonly tamanhoPagina = 50;
  paginaAtual = 0;
  totalItens = 0;
  totais: PainelExpedicaoTotais | null = null;
  private consultaPagina?: Subscription;
  private consultaTotais?: Subscription;
  branchIds: number[] = [];
  cliente: any;
  vendedor: any;
  item: string;
  groupBy: any = 'Sem';
  localidade: Localidade | null = null;
  emOrdemDeCarregamento: string | null = 'Todos';
  incoterms: string = '%';
  // '' = todos, 'pedido' ou 'nf-venda-futura'
  tipoDocumento: string = '';
  // 'todos', 'com' ou 'sem'
  frete: string = 'todos';
  constructor(
    private PainelExpedicaoPedidosService: PainelExpedicaoPedidosService
  ) {}

  ngOnInit(): void {
    const hoje = moment();
    this.startDate = hoje.clone().startOf('month').format('YYYY-MM-DD');
    this.endDate = hoje.format('YYYY-MM-DD');  
    this.getPedidos();
  }

  ngOnDestroy(): void {
    this.consultaPagina?.unsubscribe();
    this.consultaTotais?.unsubscribe();
    this.stopLoading();
  }

  private formatPedido(p: PainelExpedicaoPedidos): PainelExpedicaoPedidos {
     const m = new PainelExpedicaoPedidos();
    Object.assign(m, p);
    m.DocDate = this.formatDocDate(p.DocDate);
    m.EmOrdemDeCarregamento = p.EmOrdemDeCarregamento != null ? 'Sim' : 'Não';

    return m;
  }
  get columns(): Column[] {
    switch (this.groupBy) {
      case 'cliente':
        return [
          new Column('Tipo', 'tipo', '{{{value}}}'),
          new Column('Código Cliente', 'cardCodeRouterLink'),
          new Column('Nome Cliente', 'cardNameRouterLink'),
          new Column('Produto', 'ItemCode'),
          new Column('Descrição', 'Description'),
          new Column('Quantidade', 'Quantity'),
          new Column('Em Estoque', 'OnHand'),
          new Column('Em ordem de carregamento', 'EmOrdemDeCarregamento'),
        ];
      case 'vendedor':
        return [
          new Column('Tipo', 'tipo', '{{{value}}}'),
          new Column('Código Vendedor', 'SlpCode'),
          new Column('Nome Vendedor', 'SlpName'),
          new Column('Produto', 'ItemCode'),
          new Column('Descrição', 'Description'),
          new Column('Quantidade', 'Quantity'),
          new Column('Em Estoque', 'OnHand'),
          new Column('Em ordem de carregamento', 'EmOrdemDeCarregamento'),
        ];
      case 'item':
        return [
          new Column('Tipo', 'tipo', '{{{value}}}'),
          new Column('Código Item', 'ItemCode'),
          new Column('Descrição', 'Description'),
          new Column('Quantidade', 'Quantity'),
          new Column('Em Estoque', 'OnHand'),
          new Column('Estoque minimo', 'EstoqueMinimo'),
          new Column('Balanço', 'balanco',null,false,true),
          new Column('Em ordem de carregamento', 'EmOrdemDeCarregamento'),
        ];
      default:
        return [
          new Column('Tipo', 'tipo', '{{{value}}}'),
          new Column('Data', 'DocDate'),
          new Column('Documento', 'orderRouterLink'),
          new Column('Cliente', 'cardNameRouterLink'),
          new Column('Vendedor', 'SlpName'),
          new Column('Produto', 'ItemCode'),
          new Column('Nome do produto', 'Description'),
          new Column('Frete', 'DistribSum'),
          new Column('Qtd Imediata', 'Quantity'),
          new Column('Em Estoque', 'OnHand'),
          new Column('Em ordem de carregamento', 'EmOrdemDeCarregamento'),
          new Column('Localidade', 'Name'),
        ];
    }
  }

  // Toda mudanca de filtro: volta para a pagina 0 e refaz os totais.
  getPedidos(): void {
    if (!this.startDate || !this.endDate) return;
    if (!this.branchIds.length) {
      // Exige ao menos uma filial: sem seleção, não consulta e limpa o que estava na tela.
      this.consultaPagina?.unsubscribe();
      this.consultaTotais?.unsubscribe();
      this.stopLoading();
      this.resultado = { content: [], nextLink: null, totalElements: 0, size: 0 };
      this.totalItens = 0;
      this.paginaAtual = 0;
      this.totais = null;
      return;
    }

    this.carregarPagina(0);
    this.consultaTotais?.unsubscribe();
    this.totais = null;
    this.consultaTotais = this.PainelExpedicaoPedidosService
      .getTotais(
        this.startDate, this.endDate, this.branchIds, this.cliente, this.item, this.vendedor,
        this.localidade, this.incoterms, this.tipoDocumento, this.frete, this.emOrdemDeCarregamento
      )
      .subscribe({
        next: (t) => (this.totais = t),
        error: () => (this.totais = null),
      });
  }

  carregarPagina(pagina: number): void {
    if (!this.startDate || !this.endDate || !this.branchIds.length) return;

    this.consultaPagina?.unsubscribe();
    this.startLoading();
    this.consultaPagina = this.PainelExpedicaoPedidosService
      .getByFilters(
        this.startDate,
        this.endDate,
        this.branchIds,
        this.cliente,
        this.item,
        this.vendedor,
        this.groupBy,
        this.localidade,
        this.incoterms,
        this.tipoDocumento,
        this.frete,
        this.emOrdemDeCarregamento,
        pagina,
        this.tamanhoPagina
      )
      .subscribe({
        next: (data) => {
          this.resultado = { ...data, content: data.content.map((p) => this.formatPedido(p)) };
          this.totalItens = data.totalElements;
          this.paginaAtual = pagina;
          this.stopLoading();
        },
        error: () => {
          this.resultado = { content: [], nextLink: null, totalElements: 0, size: 0 };
          this.totalItens = 0;
          this.paginaAtual = 0;
          this.stopLoading();
        },
      });
  }

  selectLocalidade(localidade: Localidade): void {
    this.localidade = localidade;
    this.getPedidos();
  }
  private formatDocDate(ymd: string): string {
    return moment(ymd, 'YYYYMMDD').format('DD/MM/YYYY');
  }

  selectBranches(branches: Branch[]): void {
    this.branchIds = (branches ?? []).map((b) => +b.Bplid);
    this.getPedidos();
  }

  onPartnerSelected(partner: BusinessPartner | null): void {
    this.cliente = partner?.CardCode ?? '';
    this.getPedidos();
  }

  selectOriginSalesPerson(sp: SalesPerson | null): void {
    this.vendedor = sp?.SalesEmployeeCode ?? null;
    this.getPedidos();
  }

  addItem(item: Item | null): void {
    this.item = item?.ItemCode ?? null;
    this.getPedidos();
  }

  onGroupByChange(novo: string): void {
    this.groupBy = novo;
    this.getPedidos();
  }

  onIncotermsChange(novo: string): void {
    this.incoterms = novo;
    this.getPedidos();
  }
  onEmOrdemDeCarregamentoChange(value: string | null) {
  this.emOrdemDeCarregamento = value;
  this.getPedidos();
}

  action(event: any): void {}


  private startLoading(): void {
    this.carregando = true;
    this.loadingStart = Date.now();
    this.elapsedSeconds = 0;

    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
    }

    this.loadingTimer = setInterval(() => {
      if (this.loadingStart) {
        const diffMs = Date.now() - this.loadingStart;
        this.elapsedSeconds = Math.floor(diffMs / 1000);
      }
    }, 1000);
  }

  private stopLoading(): void {
    this.carregando = false;

    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = null;
    }
  }

  formatTime(): string {
    const minutes = Math.floor(this.elapsedSeconds / 60);
    const seconds = this.elapsedSeconds % 60;

    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');

    return `${mm}:${ss}`;
  }

}
