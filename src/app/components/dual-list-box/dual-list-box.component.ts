import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PedidoVenda } from '../../sap/components/document/documento.statement.component';

@Component({
  selector: 'app-dual-list-box',
  templateUrl: './dual-list-box.component.html',
  styleUrls: ['./dual-list-box.component.scss']
})
export class DualListBoxComponent {
  @Input() availableItems: PedidoVenda[] = [];
  @Input() selectedItems: PedidoVenda[] = [];
  @Output() selectedItemsChange = new EventEmitter<PedidoVenda[]>();

  searchTermAvailable = '';
  searchTermSelected = '';
  carregamentoPorPedido: boolean = false;

  // Função de ordenação por DocNum e ItemCode
  private sortItems(items: PedidoVenda[]): PedidoVenda[] {
    return items.sort((a, b) => {
      if (a.DocNum !== b.DocNum) {
        return a.DocNum - b.DocNum; // Ordena por DocNum ascendente
      }
      return a.ItemCode.localeCompare(b.ItemCode); // Dentro do mesmo DocNum, ordena por ItemCode
    });
  }

  // Group available items by DocNum
  get groupedAvailableItems(): { docNum: number, items: PedidoVenda[] }[] {
    const grouped = (this.availableItems || []).reduce((acc, item) => {
      const docNum = item.DocNum;
      if (!acc[docNum]) {
        acc[docNum] = { docNum, items: [] };
      }
      acc[docNum].items.push(item);
      return acc;
    }, {} as { [key: number]: { docNum: number, items: PedidoVenda[] } });

    return Object.values(grouped)
      .filter(group =>
        group.items.some(item =>
          `${item.CardCode} - ${item.DocNum}`.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
        )
      )
      .sort((a, b) => a.docNum - b.docNum); // Ordena os grupos por DocNum
  }

  // Group selected items by DocNum
  get groupedSelectedItems(): { docNum: number, items: PedidoVenda[] }[] {
    const grouped = (this.selectedItems || []).reduce((acc, item) => {
      const docNum = item.DocNum;
      if (!acc[docNum]) {
        acc[docNum] = { docNum, items: [] };
      }
      acc[docNum].items.push(item);
      return acc;
    }, {} as { [key: number]: { docNum: number, items: PedidoVenda[] } });

    return Object.values(grouped)
      .filter(group =>
        group.items.some(item =>
          `${item.CardCode} - ${item.DocNum}`.toLowerCase().includes(this.searchTermSelected.toLowerCase())
        )
      )
      .sort((a, b) => a.docNum - b.docNum); // Ordena os grupos por DocNum
  }

  toggleCarregamentoPorPedido(): void {
    this.carregamentoPorPedido = !this.carregamentoPorPedido;
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
    this.availableItems = this.sortItems([...(this.availableItems || []), ...(this.selectedItems || [])]);
    this.selectedItems = [];
    this.selectedItemsChange.emit(this.selectedItems);
  }
}