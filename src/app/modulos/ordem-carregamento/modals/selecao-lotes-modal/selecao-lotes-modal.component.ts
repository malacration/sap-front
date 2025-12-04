import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';

@Component({
  selector: 'app-selecao-lotes-modal',
  templateUrl: './selecao-lotes-modal.component.html'
})
export class SelecaoLotesModalComponent {
  @Input() show: boolean = false;
  @Input() pedidos: any[] = [];
  @Input() loading: boolean = false;
  
  @Output() showChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<Map<string, BatchStock[]>>(); 

  currentPedido: any | null = null;
  lotesSelecionadosPorItem: Map<string, BatchStock[]> = new Map();

  selecionarPedido(pedido: any) {
    this.currentPedido = pedido;
  }

  onLotesSelecionados(lotes: BatchStock[]) {
    if (this.currentPedido && lotes.length > 0) {
      this.lotesSelecionadosPorItem.set(this.currentPedido.ItemCode, lotes);
    }
  }

  confirmar() {
    this.confirm.emit(this.lotesSelecionadosPorItem);
  }

  close() {
    this.showChange.emit(false);
    this.currentPedido = null; 
  }
}