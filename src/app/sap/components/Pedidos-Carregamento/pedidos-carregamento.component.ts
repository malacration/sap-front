import { NextLinkService } from './../../../shared/service/nextLink.service';
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
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
  templateUrl: './pedidos-carregamento.component.html',
  styleUrls: ['./pedidos-carregamento.component.scss'],
})
export class PedidosCarregamentoComponent implements OnInit {
  startDate = '';
  endDate = '';

  filteredPedidos: PedidoCarregamento[] = [];
  carregando = false;
  item: string;
  branchId: string;
  vendedor: any;
  cliente: any;
  groupBy: any;
  pageSize = 20;
  currentPage = 1;
  resultado: Page<PedidoCarregamento>;

  constructor(
    private pedidosService: PedidosCarregamentoService,
    private nextLinkService: NextLinkService
  ) {}

  ngOnInit(): void {
    const hoje = moment().format('YYYY-MM-DD');
    this.startDate = hoje;
    this.endDate = hoje;
    this.filterPedidos();
  }

  resetFilters() {
    this.startDate = null;
    this.endDate = null;
    this.branchId = '';
    this.cliente = '';
    this.item = '';
    this.vendedor = '';
    this.groupBy = null;
    this.filteredPedidos = [];
  }

  filterPedidos(): void {
    if (!this.startDate || !this.endDate || this.branchId == null) return;
    this.carregando = true;
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
          this.filteredPedidos = data.content;
          this.resultado = data;
          this.currentPage = 1;
          this.carregando = false;
        },
        error: () => {
          this.filteredPedidos = [];
          this.carregando = false;
        },
      });
  }
  /** formata yyyyMMdd → dd/MM/YYYY */
  formatDocDate(ymd: string): string {
    return moment(ymd, 'YYYYMMDD').format('DD/MM/YYYY');
  }

  get pagedPedidos(): PedidoCarregamento[] {
    if (!this.filteredPedidos) return [];
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPedidos.slice(start, start + this.pageSize);
  }

  onPageChange(novaPagina: number) {
    this.currentPage = novaPagina;
  }

  selectOriginSalesPerson(salesPerson: SalesPerson): void {
    this.vendedor = salesPerson.SalesEmployeeCode;
    this.filterPedidos();
  }

  onPartnerSelected(partner: BusinessPartner) {
    this.cliente = partner.CardCode;
    this.filterPedidos();
  }
  onGroupByChange(novo: string) {
    this.groupBy = novo;
    this.filterPedidos();
  }
  selectBranch(branch: Branch) {
    this.branchId = branch.bplid;
    if (this.startDate && this.endDate) {
      this.filterPedidos();
    }
  }
  addItem(ItemCode: Item) {
    this.item = ItemCode.ItemCode;
    console.log(ItemCode.ItemCode);
    this.filterPedidos();
  }
  getDefinition() {
    return [
      new Column('id', 'CardCode'),
      new Column('qtd', 'QuantidadeCurency'),
    ];
  }

  action($event) {}

  nextLink() {
    this.nextLinkService
      .next<Page<PedidoCarregamento>>(this.resultado.nextLink)
      .subscribe((it) => {
        this.filteredPedidos.push(...it.content);
        this.resultado.nextLink = it.nextLink;
        this.resultado.content.push(...it.content);
      });
  }
}
