import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { NextLinkService } from '../../../shared/service/nextLink.service';
import {
  PedidosCarregamentoService,
  PedidoCarregamento,
} from '../../service/pedidos-carregamento.service';
import { Branch } from '../../model/branch';
import { SalesPerson } from '../../model/sales-person/sales-person';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { Item } from '../../model/item';
import { Column } from '../../../shared/components/table/column.model';
import { Page } from '../../model/page.model';

@Component({
  selector: 'pedidos-carregamento',
  templateUrl: './painel-expedicao-pedidos.component.html',
  styleUrls: ['.//painel-expedicao-pedidos.component.scss'],
})
export class PainelExpedicaoPedidosComponent implements OnInit {
  startDate = '';
  endDate = '';
  carregando = false;

  resultado: Page<PedidoCarregamento> = {
    content: [],
    nextLink: null,
    totalElements: 0,
    size: 0,
  };

  branchId: string;
  cliente: any;
  vendedor: any;
  item: string;
  groupBy: any;

  constructor(
    private pedidosService: PedidosCarregamentoService,
    private nextLinkService: NextLinkService
  ) {}

  ngOnInit(): void {
    const hoje = moment().format('YYYY-MM-DD');
    this.startDate = hoje;
    this.endDate = hoje;
    this.getPedidos();
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
        ];
      case 'vendedor':
        return [
          new Column('Código Vendedor', 'SlpCode'),
          new Column('Nome Vendedor', 'SlpName'),
          new Column('Produto', 'ItemCode'),
          new Column('Descrição', 'Description'),
          new Column('Quantidade', 'Quantity'),
          new Column('Em Estoque', 'OnHand'),
        ];
      case 'item':
        return [
          new Column('Código Item', 'ItemCode'),
          new Column('Descrição', 'Description'),
          new Column('Quantidade', 'Quantity'),
          new Column('Em Estoque', 'OnHand'),
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
        ];
    }
  }

  getPedidos(): void {
    if (!this.startDate || !this.endDate || this.branchId == null) return;
    this.carregando = true;
    console.log('>> getPedidos()', {
      startDate: this.startDate,
      endDate: this.endDate,
      branchId: this.branchId,
      cliente: this.cliente,
      item: this.item,
      vendedor: this.vendedor,
      groupBy: this.groupBy,
    });
    this.pedidosService
      .getByFilters(
        this.startDate,
        this.endDate,
        +this.branchId,
        this.cliente,
        this.item,
        this.vendedor,
        this.groupBy
      )
      .subscribe({
        next: (data) => {
          const formatted = data.content.map((p) => ({
            ...p,
            DocDate: this.formatDocDate(p.DocDate),
          }));
          this.resultado = {
            ...data,
            content: formatted,
          };
          this.carregando = false;
        },
        error: () => {
          this.resultado.content = [];
          this.carregando = false;
        },
      });
  }

  private formatDocDate(ymd: string): string {
    return moment(ymd, 'YYYYMMDD').format('DD/MM/YYYY');
  }

  selectBranch(branch: Branch): void {
    this.branchId = branch.bplid;
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

  action(event: any): void {}

  nextLink(): void {
    if (!this.resultado.nextLink) return;
    this.carregando = true;

    this.nextLinkService
      .next<PedidoCarregamento>(this.resultado.nextLink)
      .subscribe({
        next: (page) => {
          const formatted = page.content.map((p) => ({
            ...p,
            DocDate: this.formatDocDate(p.DocDate),
          }));
          this.resultado = {
            ...this.resultado,
            content: [...this.resultado.content, ...formatted],
            nextLink: page.nextLink,
          };
          this.carregando = false;
        },
        error: (err) => {
          console.error('Erro no nextLink()', err);
          this.carregando = false;
        },
      });
  }
}
