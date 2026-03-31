import { Component, ViewChild } from '@angular/core';
import { PedidosVendaService } from '../../../service/document/pedidos-venda.service';
import { Branch } from '../../../model/branch';
import { ListComponent } from '../core/list/list.component';


@Component({
  selector: 'app-marketing-document-pedidos-venda',
  templateUrl: './pedidos-venda-statement.component.html',
  styleUrls: ['./pedidos-venda-statement.component.scss']
})
export class PedidosVendaStatementComponent {

  @ViewChild('lista') lista: ListComponent;

  statusOptions = [
    { key: 'bost_Open', label: 'Aberto' },
    { key: 'bost_Close', label: 'Fechado' },
  ];

  filialSelecionada: Branch | null = null;
  dataFiltro: string = new Date().toISOString().split('T')[0];

  constructor(public pedidosVendaService: PedidosVendaService) {
    this.pedidosVendaService.filtro.data = this.dataFiltro;
    this.pedidosVendaService.filtro.status = 'bost_Open';
  }

  onStatusChange(event: Event) {
    const status = (event.target as HTMLSelectElement).value;
    this.pedidosVendaService.filtro.status = status || undefined;
    this.lista.reload();
  }

  onFilialChange(branch: Branch) {
    this.filialSelecionada = branch ?? null;
    const filial = branch?.Bplid != null ? Number(branch.Bplid) : undefined;
    this.pedidosVendaService.filtro.filial = filial === -1 ? undefined : filial;
    this.lista.reload();
  }

  onClienteChange(parceiro: any) {
    this.pedidosVendaService.filtro.cliente = parceiro?.CardCode ?? undefined;
    this.lista.reload();
  }

  onDataChange(event: Event) {
    const data = (event.target as HTMLInputElement).value;
    this.pedidosVendaService.filtro.data = data || undefined;
    this.lista.reload();
  }
}
