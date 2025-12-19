import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';

import { Branch } from '../../../../sap/model/branch';
import { SalesPerson } from '../../../../sap/model/sales-person/sales-person';
import { BusinessPartner } from '../../../../sap/model/business-partner/business-partner';
import { Item } from '../../../../sap/model/item';
import { Column } from '../../../../shared/components/table/column.model';
import { Page } from '../../../../sap/model/page.model';
import { NextLinkService } from '../../../../sap/service/nextLink.service';
import { PainelExpedicaoPedidos } from '../../../../sap/model/painel-expedicao-pedidos.model';
import { Localidade } from '../../../../sap/model/localidade/localidade';
import { PainelExpedicaoPedidosService } from '../../service/pedidos-carregamento.service';

@Component({
  selector: 'painel-expedicao-pedidos',
  templateUrl: './painel-expedicao-pedidos.component.html',
})
export class PainelExpedicaoPedidosComponent implements OnInit {
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
  private todosPedidos: PainelExpedicaoPedidos[] = [];
  branchId: string;
  cliente: any;
  vendedor: any;
  item: string;
  groupBy: any = 'Sem';
  localidade: Localidade | null = null;
  emOrdemDeCarregamento: string | null = 'Todos';
  incoterms: string = '%';
  constructor(
    private PainelExpedicaoPedidosService: PainelExpedicaoPedidosService
  ) {}

  ngOnInit(): void {
    const hoje = moment();
    this.startDate = hoje.clone().startOf('month').format('YYYY-MM-DD');
    this.endDate = hoje.format('YYYY-MM-DD');  
    this.getPedidos();
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
          new Column('Código Cliente', 'CardCode'),
          new Column('Nome Cliente', 'CardName'),
          new Column('Produto', 'ItemCode'),
          new Column('Descrição', 'Description'),
          new Column('Quantidade', 'Quantity'),
          new Column('Em Estoque', 'OnHand'),
          new Column('Em ordem de carregamento', 'EmOrdemDeCarregamento'),
        ];
      case 'vendedor':
        return [
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
          new Column('Data', 'DocDate'),
          new Column('Cliente', 'CardName'),
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

  getPedidos(): void {
    if (!this.startDate || !this.endDate || this.branchId == null) return;

    this.startLoading();
    this.PainelExpedicaoPedidosService
      .getByFilters(
        this.startDate,
        this.endDate,
        +this.branchId,
        this.cliente,
        this.item,
        this.vendedor,
        this.groupBy,
        this.localidade,
        this.incoterms
      )
      .subscribe({
        next: (data) => {
          const conteudoFormatado = data.content.map((p) =>
            this.formatPedido(p)
          );

          // guarda todos sem filtro
          this.todosPedidos = conteudoFormatado;

          // aplica filtro no front
          this.aplicarFiltrosFront();

          // mantém outros metadados da paginação
          this.resultado = {
            ...this.resultado,
            nextLink: data.nextLink,
            totalElements: this.resultado.content.length,
            size: this.resultado.content.length,
          };

          this.stopLoading();
        },
        error: () => {
          this.todosPedidos = [];
          this.resultado.content = [];
          this.resultado.totalElements = 0;
          this.resultado.size = 0;
          this.stopLoading();
        },
      });
  }
private aplicarFiltrosFront(): void {
    let filtrados = [...this.todosPedidos];

    if (this.emOrdemDeCarregamento === 'Sim') {
      filtrados = filtrados.filter(
        (p) => p.EmOrdemDeCarregamento === 'Sim'
      );
    } else if (this.emOrdemDeCarregamento === 'Não') {
      filtrados = filtrados.filter(
        (p) => p.EmOrdemDeCarregamento === 'Não'
      );
    }
  

    this.resultado = {
      ...this.resultado,
      content: filtrados,
      totalElements: filtrados.length,
      size: filtrados.length,
    };
  }

  selectLocalidade(localidade: Localidade): void {
    this.localidade = localidade;
    this.getPedidos();
  }
  private formatDocDate(ymd: string): string {
    return moment(ymd, 'YYYYMMDD').format('DD/MM/YYYY');
  }

  selectBranch(branch: Branch): void {
    this.branchId = branch.Bplid;
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
