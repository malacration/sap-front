import { Component, OnInit, ViewChild } from '@angular/core';
import { Branch } from '../../model/branch';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PedidoVenda } from '../document/documento.statement.component';
import { FaturasService } from '../../service/fatura/faturas.service';
import { NextLink } from '../../model/next-link';

@Component({
  selector: 'app-ordem-carregamento',
  templateUrl: './ordem-carregamento.component.html',
  styleUrls: ['./ordem-carregamento.component.scss']
})
export class OrdemCarregamentoComponent implements OnInit {
  nomeOrdemCarregamento = '';
  dataInicial: string | null = null;
  dataFinal: string | null = null;
  originList: PedidoVenda[] = [];
  destinationList: PedidoVenda[] = [];
  originalOrder: PedidoVenda[] = [];
  isOn = false;
  branchId: string;
  selectedBranch: Branch;
  localidadeId: number;
  selectedLocalidade: BusinessPartner;
  isDestinationMinimized = false;
  originSearch = '';
  destinationSearch = '';
  pedidosNext

  @ViewChild('previewModal', { static: true }) previewModal: ModalComponent;
  @ViewChild('returnAllModal', { static: true }) returnAllModal: ModalComponent;

  constructor(private orderSalesService: FaturasService) {}

  ngOnInit(): void {}

  changePageFunction($event){
    this.orderSalesService.search($event).subscribe(it => {
      this.pedidosNext.content.push(...it.content)
      this.pedidosNext.nextLink = it.nextLink
    })
  }

  toggle(): void {
    this.isOn = !this.isOn;
  }

  clearDate(field: 'dataInicial' | 'dataFinal'): void {
    this[field] = null;
  }

  selectBranch(branch: Branch): void {
    this.branchId = branch.bplid;
    this.selectedBranch = branch;
  }

  selectLocalidade(bp: BusinessPartner): void {
    this.localidadeId = bp.U_Localidade;
    this.selectedLocalidade = bp;
  }

  get isFilterValid(): boolean {
    return !!this.selectedBranch && !!this.selectedLocalidade;
  }

  filtrarPedidos(): void {
    if (!this.isFilterValid) {
      console.warn('Please select branch and locality');
      this.resetLists();
      return;
    }

    const startDate = this.dataInicial || '';
    const endDate = this.dataFinal || '';

    this.orderSalesService
      .getPedidos(startDate, endDate, this.branchId, this.localidadeId)
      .subscribe({
        next: pedidos => this.handlePedidosSuccess(pedidos),
        error: err => this.handlePedidosError(err)
      });
  }

  private handlePedidosSuccess(pedidos: NextLink<PedidoVenda>): void {
    this.pedidosNext = pedidos
    this.originList = this.sortPedidos(pedidos.content || []);
    this.originalOrder = [...this.originList];
    this.resetSearchFields();
  }

  private handlePedidosError(error: any): void {
    console.error('Error fetching pedidos:', error);
    this.resetLists();
  }

  private resetLists(): void {
    this.originList = [];
    this.originalOrder = [];
    this.destinationList = [];
    this.resetSearchFields();
  }

  private resetSearchFields(): void {
    this.originSearch = '';
    this.destinationSearch = '';
  }

  private sortPedidos(pedidos: PedidoVenda[]): PedidoVenda[] {
    return [...pedidos].sort((a, b) => {
      const docNumCompare = String(a.DocNum ?? '').localeCompare(String(b.DocNum ?? ''));
      return docNumCompare || String(a.CardCode ?? '').localeCompare(String(b.CardCode ?? ''));
    });
  }

  getGroupedList(list: PedidoVenda[], searchTerm: string): { docNum: string; items: PedidoVenda[] }[] {
    const filteredList = this.filterList(list, searchTerm);
    const grouped = this.groupByDocNum(filteredList);
    return this.sortGroupedList(grouped);
  }

  private groupByDocNum(list: PedidoVenda[]): Record<string, PedidoVenda[]> {
    return list.reduce((acc, pedido) => {
      const key = String(pedido.DocNum ?? 'unknown');
      acc[key] = acc[key] || [];
      acc[key].push(pedido);
      return acc;
    }, {} as Record<string, PedidoVenda[]>);
  }

  private sortGroupedList(grouped: Record<string, PedidoVenda[]>): { docNum: string; items: PedidoVenda[] }[] {
    return Object.keys(grouped)
      .sort()
      .map(docNum => ({ docNum, items: grouped[docNum] }));
  }

  consultarEstoque(): void {
    this.previewModal.openModal();
  }

  moveToDestination(pedido: PedidoVenda): void {
    const itemsToMove = this.isOn 
      ? this.originList.filter(item => item.DocNum == pedido.DocNum)
      : [pedido];

    this.originList = this.originList.filter(item => 
      !itemsToMove.some(moveItem => moveItem == item)
    );
    this.destinationList = [...this.destinationList, ...itemsToMove];
  }

  moveToOrigin(pedido: PedidoVenda): void {
    this.destinationList = this.destinationList.filter(item => item != pedido);
    this.insertPedidoInOriginalOrder(pedido);
  }

  private insertPedidoInOriginalOrder(pedido: PedidoVenda): void {
    const originalIndex = this.findOriginalIndex(pedido);
    if (originalIndex < 0) {
      this.originList = [...this.originList, pedido];
      return;
    }

    let insertIndex = 0;
    for (let i = 0; i < this.originList.length; i++) {
      const currentOriginalIndex = this.findOriginalIndex(this.originList[i]);
      if (currentOriginalIndex > originalIndex) break;
      insertIndex = i + 1;
    }

    this.originList = [
      ...this.originList.slice(0, insertIndex),
      pedido,
      ...this.originList.slice(insertIndex)
    ];
  }

  private findOriginalIndex(pedido: PedidoVenda): number {
    return this.originalOrder.findIndex(item => 
      item == pedido || (
        item.DocNum == pedido.DocNum &&
        item.CardCode == pedido.CardCode &&
        item.CardName == pedido.CardName &&
        item.BuyUnitMsr == pedido.BuyUnitMsr
      )
    );
  }

  openReturnAllModal(): void {
    this.returnAllModal.openModal();
  }

  returnAllToOrigin(): void {
    [...this.destinationList].forEach(pedido => this.moveToOrigin(pedido));
    this.returnAllModal.closeModal();
  }

  private filterList(list: PedidoVenda[], search: string): PedidoVenda[] {
    return !search 
      ? list 
      : list.filter(item => 
          String(item.DocNum ?? '').toLowerCase().includes(search.toLowerCase())
      );
  }

  sendOrder(): void {
    console.log('Creating ordem de carregamento:', {
      nome: this.nomeOrdemCarregamento,
      origin: this.originList,
      destination: this.destinationList
    });
  }

  toggleDestinationMinimize(): void {
    this.isDestinationMinimized = !this.isDestinationMinimized;
  }

  get totalWeight(): number {
    return this.destinationList.reduce((total, pedido) => total + (pedido.Weight || 0), 0);
  }
}