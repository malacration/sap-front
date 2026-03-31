import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { PedidosVendaService } from '../../../service/document/pedidos-venda.service';
import { BranchService } from '../../../service/branch.service';
import { Branch } from '../../../model/branch';
import { ListComponent } from '../core/list/list.component';


@Component({
  selector: 'app-marketing-document-pedidos-venda',
  templateUrl: './pedidos-venda-statement.component.html',
  styleUrls: ['./pedidos-venda-statement.component.scss']
})
export class PedidosVendaStatementComponent implements AfterViewInit {

  @ViewChild('lista') lista: ListComponent;

  statusOptions = [
    { key: 'bost_Open', label: 'Aberto' },
    { key: 'bost_Close', label: 'Fechado' },
  ];

  filialSelecionada: Branch | null = null;
  dataFiltro: string = new Date().toISOString().split('T')[0];

  constructor(
    public pedidosVendaService: PedidosVendaService,
    private branchService: BranchService
  ) {
    this.pedidosVendaService.filtro.data = this.dataFiltro;
    this.pedidosVendaService.filtro.status = 'bost_Open';
  }

  ngAfterViewInit(): void {
    this.branchService.get().subscribe(branches => {
      if (branches?.length) {
        this.filialSelecionada = branches[0];
        this.pedidosVendaService.filtro.filial = Number(branches[0].Bplid);
        this.lista.reload();
      }
    });
  }

  onStatusChange(event: Event) {
    const status = (event.target as HTMLSelectElement).value;
    this.pedidosVendaService.filtro.status = status || undefined;
    this.lista.reload();
  }

  onFilialChange(branch: Branch) {
    this.pedidosVendaService.filtro.filial = branch?.Bplid ? Number(branch.Bplid) : undefined;
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
