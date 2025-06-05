import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PedidoVenda } from '../../sap/components/document/documento.statement.component';

@Component({
  selector: 'app-dual-list-box',
  templateUrl: './dual-list-box.component.html',
  styleUrls: ['./dual-list-box.component.scss']
})
export class DualListBoxComponent {
  @Input() availableItems: PedidoVenda[] = []; // Inicializa com array vazio
  @Input() selectedItems: PedidoVenda[] = []; // Inicializa com array vazio
  @Output() selectedItemsChange = new EventEmitter<PedidoVenda[]>();
  
  searchTermAvailable = '';
  searchTermSelected = '';

  get filteredAvailableItems(): PedidoVenda[] {
    // Verifica se availableItems existe antes de filtrar
    return (this.availableItems || []).filter(item => 
      `${item.CardCode} - ${item.DocNum}`.toLowerCase().includes(this.searchTermAvailable.toLowerCase())
    );
  }

  get filteredSelectedItems(): PedidoVenda[] {
    // Verifica se selectedItems existe antes de filtrar
    return (this.selectedItems || []).filter(item => 
      `${item.CardCode} - ${item.DocNum}`.toLowerCase().includes(this.searchTermSelected.toLowerCase())
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