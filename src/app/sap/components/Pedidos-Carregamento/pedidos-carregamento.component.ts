import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import {
  PedidosCarregamentoService,
  PedidoCarregamento,
} from '../../service/pedidos-carregamento.service';

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
  branchId = '2';
  vendedor: any;
  cliente: any;
  agrupador: any;
  pageSize = 20;
  currentPage = 1;

  constructor(private pedidosService: PedidosCarregamentoService) {}

  ngOnInit(): void {
    // opcional: inicializar com data de hoje se quiser
    // const hoje = moment().format('YYYY-MM-DD');
    // this.startDate = hoje;
    // this.endDate   = hoje;
    // this.filterPedidos();
  }

  /** dispara sempre que muda startDate ou endDate */
  // pedidos-carregamento.component.ts

  filterPedidos(): void {
    if (!this.startDate || !this.endDate) {
      this.filteredPedidos = [];
      return;
    }

    this.carregando = true;
    this.pedidosService.getByDates(this.startDate, this.endDate).subscribe({
      next: (pedidosArray) => {
        console.log('array vindo do service', pedidosArray);
        this.filteredPedidos = pedidosArray;
        this.currentPage = 1;
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao buscar pedidos por datas:', err);
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

  selectOriginSalesPerson($event: any): void {
    this.vendedor = $event;
  }

  selectOnPartnerSelected($event: any): void {
    this.cliente = $event;
  }
  onGroupByChange(novo: string): void {
    this.agrupador = novo;
    console.log(novo);
  }
}
