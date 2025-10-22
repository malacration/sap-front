import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PedidoVenda } from '../document/documento.statement.component';
import { AlertService } from '../../service/alert.service';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';

@Component({
  selector: 'app-dual-list-box',
  templateUrl: './dual-list-box.component.html',
  styleUrls: ['./dual-list-box.component.scss']
})
export class DualListBoxComponent {
  @Input() availableItems: PedidoVenda[] = [];
  @Input() selectedItems: PedidoVenda[] = [];
  @Input() showStock: boolean = false;
  @Input() nextLink: string = '';
  @Input() isLoadingOrders: boolean = false;
  @Output() selectedItemsChange = new EventEmitter<PedidoVenda[]>();
  @Output() loadMore = new EventEmitter<void>();

  quantidadesEmCarregamento: { [itemCode: string]: number } = {};
  isLoading: { [itemCode: string]: boolean } = {};
  searchTermAvailable: string = '';
  searchTermSelected: string = '';
  carregamentoPorPedido: boolean = true;
  isSelectedListCollapsed: boolean = false;

  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService
  ) {}

  ngOnChanges(): void {
    if (this.showStock && this.availableItems.length > 0) {
      this.loadQuantidadesEmCarregamento();
    }
  }

  get totalSelectedWeight(): number {
    return this.selectedItems.reduce((sum, item) => sum + (item.Quantity * item.Weight1), 0);
  }

  get availableOrdersCount(): number {
    const uniqueDocNums = new Set(this.availableItems.map(item => item.DocNum));
    return uniqueDocNums.size;
  }

  get selectedOrdersCount(): number {
    const uniqueDocNums = new Set(this.selectedItems.map(item => item.DocNum));
    return uniqueDocNums.size;
  }

  get groupedAvailableItems(): { docNum: number; items: PedidoVenda[] }[] {
    return this.groupItems(this.availableItems, this.searchTermAvailable);
  }

  get groupedSelectedItems(): { docNum: number; items: PedidoVenda[] }[] {
    return this.groupItems(this.selectedItems, this.searchTermSelected);
  }

  private groupItems(items: PedidoVenda[], searchTerm: string): { docNum: number; items: PedidoVenda[] }[] {
    const grouped = items.reduce((acc, item) => {
      const docNum = item.DocNum;
      if (!acc[docNum]) {
        acc[docNum] = { docNum, items: [] };
      }
      acc[docNum].items.push(item);
      return acc;
    }, {} as { [key: number]: { docNum: number; items: PedidoVenda[] } });

    return Object.values(grouped)
      .filter(group => group.items.some(item =>
        `${item.ItemCode || ''} ${item.Dscription || ''} ${item.Name || ''} ${group.docNum}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ))
      .sort((a, b) => a.docNum - b.docNum);
  }

  private sortItems(items: PedidoVenda[]): PedidoVenda[] {
    return items.sort((a, b) => a.DocNum - b.DocNum || a.ItemCode.localeCompare(b.ItemCode));
  }

  selectItem(item: PedidoVenda): void {
    const itemsToMove = this.carregamentoPorPedido
      ? this.availableItems.filter(i => i.DocNum == item.DocNum)
      : [item];
    this.selectedItems = this.sortItems([...this.selectedItems, ...itemsToMove]);
    this.availableItems = this.sortItems(this.availableItems.filter(i => !itemsToMove.includes(i)));
    this.selectedItemsChange.emit(this.selectedItems);
  }

  removeItem(item: PedidoVenda): void {
    const itemsToRemove = this.carregamentoPorPedido
      ? this.selectedItems.filter(i => i.DocNum == item.DocNum)
      : [item];
    this.availableItems = this.sortItems([...this.availableItems, ...itemsToRemove]);
    this.selectedItems = this.sortItems(this.selectedItems.filter(i => !itemsToRemove.includes(i)));
    this.selectedItemsChange.emit(this.selectedItems);
  }

  selectAll(): void {
    this.selectedItems = this.sortItems([...this.selectedItems, ...this.availableItems]);
    this.availableItems = [];
    this.selectedItemsChange.emit(this.selectedItems);
  }

  removeAll(): void {
    this.alertService.confirm('Deseja realmente remover todos os itens selecionados?').then(result => {
      if (result.isConfirmed) {
        this.availableItems = this.sortItems([...this.availableItems, ...this.selectedItems]);
        this.selectedItems = [];
        this.selectedItemsChange.emit(this.selectedItems);
      }
    });
  }

  toggleSelectedList(): void {
    this.isSelectedListCollapsed = !this.isSelectedListCollapsed;
  }

  loadMoreOrders(): void {
    this.loadMore.emit();
  }

  private loadQuantidadesEmCarregamento(): void {
    this.availableItems.forEach(item => {
      if (item.ItemCode && !this.isLoading[item.ItemCode]) {
        this.fetchQuantidadeEmCarregamento(item);
      }
    });
  }

  private fetchQuantidadeEmCarregamento(item: PedidoVenda): void {
    this.isLoading[item.ItemCode] = true;
    this.ordemCarregamentoService.getEstoqueEmCarregamento(item.ItemCode).subscribe({
      next: (quantidade) => {
        this.quantidadesEmCarregamento[item.ItemCode] = quantidade;
        this.isLoading[item.ItemCode] = false;
      },
      error: () => {
        this.quantidadesEmCarregamento[item.ItemCode] = 0;
        this.isLoading[item.ItemCode] = false;
      }
    });
  }
}