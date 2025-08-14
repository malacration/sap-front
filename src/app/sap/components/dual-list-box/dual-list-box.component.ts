import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SweetAlertResult } from 'sweetalert2';
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
  @Output() selectedItemsChange = new EventEmitter<PedidoVenda[]>();
  @Output() loadMore = new EventEmitter<void>();
  @Input() isLoadingOrders: boolean = false;

  quantidadesEmCarregamento: { [itemCode: string]: number | undefined } = {};
  isLoading: { [itemCode: string]: boolean } = {};
  searchTermAvailable: string = '';
  searchTermSelected: string = '';
  carregamentoPorPedido: boolean = false;
  isSelectedListCollapsed: boolean = false;

  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService
  ) {}

  ngOnChanges(): void {
    if (this.showStock) {
      this.loadQuantidadesEmCarregamento();
    }
  }

  get totalSelectedWeight(): number {
    return this.selectedItems.reduce((sum, item) => sum + (item.Quantity * item.Weight1), 0);
  }

  calculateCarregamento(item: PedidoVenda, isSelected: boolean): number {
    const stock = (item.OnHand || 0) - (item.IsCommited || 0) + (item.OnOrder || 0);
    return isSelected ? stock - (item.Quantity || 0) : stock;
  }

  private sortItems(items: PedidoVenda[]): PedidoVenda[] {
    return items.sort((a, b) => {
      if (a.DocNum !== b.DocNum) {
        return a.DocNum - b.DocNum;
      }
      return a.ItemCode.localeCompare(b.ItemCode);
    });
  }

  get groupedAvailableItems(): { docNum: number; items: PedidoVenda[] }[] {
    const grouped = (this.availableItems || []).reduce((acc, item) => {
      const docNum = item.DocNum;
      if (!acc[docNum]) {
        acc[docNum] = { docNum, items: [] };
      }
      acc[docNum].items.push(item);
      return acc;
    }, {} as { [key: number]: { docNum: number; items: PedidoVenda[] } });

    return Object.values(grouped)
      .filter(group => group.items.length > 0)
      .filter(group =>
        group.items.some(item =>
          `${item.ItemCode || ''} ${item.Dscription || ''} ${item.Name || ''} ${group.docNum}`
            .toLowerCase()
            .includes(this.searchTermAvailable.toLowerCase())
        )
      )
      .sort((a, b) => a.docNum - b.docNum);
  }

  get groupedSelectedItems(): { docNum: number; items: PedidoVenda[] }[] {
    const grouped = (this.selectedItems || []).reduce((acc, item) => {
      const docNum = item.DocNum;
      if (!acc[docNum]) {
        acc[docNum] = { docNum, items: [] };
      }
      acc[docNum].items.push(item);
      return acc;
    }, {} as { [key: number]: { docNum: number; items: PedidoVenda[] } });

    return Object.values(grouped)
      .filter(group => group.items.length > 0)
      .filter(group =>
        group.items.some(item =>
          `${item.ItemCode || ''} ${item.Dscription || ''} ${item.Name || ''} ${group.docNum}`
            .toLowerCase()
            .includes(this.searchTermSelected.toLowerCase())
        )
      )
      .sort((a, b) => a.docNum - b.docNum);
  }

  getQuantidadeEmCarregamento(item: PedidoVenda): number {
    return this.quantidadesEmCarregamento[item.ItemCode] ?? 0;
  }

  loadQuantidadesEmCarregamento() {
    this.availableItems.forEach(item => {
      if (item.ItemCode && !this.isLoading[item.ItemCode]) {
        this.isLoading[item.ItemCode] = true;
        this.quantidadesEmCarregamento[item.ItemCode] = undefined;
        this.ordemCarregamentoService.getEstoqueEmCarregamento(item.ItemCode)
          .subscribe({
            next: (quantidade) => {
              this.quantidadesEmCarregamento[item.ItemCode] = quantidade;
              this.isLoading[item.ItemCode] = false;
            },
            error: (err) => {
              console.error(`Error loading quantidade for ${item.ItemCode}:`, err);
              this.quantidadesEmCarregamento[item.ItemCode] = 0;
              this.isLoading[item.ItemCode] = false;
            }
          });
      }
    });
  }

  toggleCarregamentoPorPedido(): void {
    this.carregamentoPorPedido = !this.carregamentoPorPedido;
  }

  toggleSelectedList(): void {
    this.isSelectedListCollapsed = !this.isSelectedListCollapsed;
  }

  selectItem(item: PedidoVenda): void {
    if (this.carregamentoPorPedido) {
      const itemsToMove = this.availableItems.filter(i => i.DocNum === item.DocNum);
      this.selectedItems = this.sortItems([...(this.selectedItems || []), ...itemsToMove]);
      this.availableItems = this.sortItems((this.availableItems || []).filter(i => i.DocNum !== item.DocNum));
    } else {
      this.selectedItems = this.sortItems([...(this.selectedItems || []), item]);
      this.availableItems = this.sortItems((this.availableItems || []).filter(i => i !== item));
    }
    this.selectedItemsChange.emit(this.selectedItems);
  }

  removeItem(item: PedidoVenda): void {
    if (this.carregamentoPorPedido) {
      const itemsToRemove = this.selectedItems.filter(i => i.DocNum === item.DocNum);
      this.availableItems = this.sortItems([...(this.availableItems || []), ...itemsToRemove]);
      this.selectedItems = this.sortItems((this.selectedItems || []).filter(i => i.DocNum !== item.DocNum));
    } else {
      this.availableItems = this.sortItems([...(this.availableItems || []), item]);
      this.selectedItems = this.sortItems((this.selectedItems || []).filter(i => i !== item));
    }
    this.selectedItemsChange.emit(this.selectedItems);
  }

  selectAll(): void {
    this.selectedItems = this.sortItems([...(this.selectedItems || []), ...(this.availableItems || [])]);
    this.availableItems = [];
    this.selectedItemsChange.emit(this.selectedItems);
  }

  removeAll(): void {
    this.alertService.confirm('Deseja realmente remover todos os itens selecionados?').then((result: SweetAlertResult) => {
      if (result.isConfirmed) {
        this.availableItems = this.sortItems([...(this.availableItems || []), ...(this.selectedItems || [])]);
        this.selectedItems = [];
        this.selectedItemsChange.emit(this.selectedItems);
      }
    });
  }

  loadMoreOrders(): void {
    this.loadMore.emit();
  }
}