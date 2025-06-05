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

    return Object.values(grouped).filter(group =>
      group.items.some(item =>
        `${item.CardCode} - ${item.DocNum}`.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
      )
    );
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

    return Object.values(grouped).filter(group =>
      group.items.some(item =>
        `${item.CardCode} - ${item.DocNum}`.toLowerCase().includes(this.searchTermSelected.toLowerCase())
      )
    );
  }

  selectItem(item: PedidoVenda): void {
    this.selectedItems = [...(this.selectedItems || []), item];
    this.availableItems = (this.availableItems || []).filter(i => i.DocNum !== item.DocNum);
    this.selectedItemsChange.emit(this.selectedItems);
  }

  removeItem(item: PedidoVenda): void {
    this.availableItems = [...(this.availableItems || []), item];
    this.selectedItems = (this.selectedItems || []).filter(i => i.DocNum !== item.DocNum);
    this.selectedItemsChange.emit(this.selectedItems);
  }

  selectAll(): void {
    this.selectedItems = [...(this.selectedItems || []), ...(this.availableItems || [])];
    this.availableItems = [];
    this.selectedItemsChange.emit(this.selectedItems);
  }

  removeAll(): void {
    this.availableItems = [...(this.availableItems || []), ...(this.selectedItems || [])];
    this.selectedItems = [];
    this.selectedItemsChange.emit(this.selectedItems);
  }
}