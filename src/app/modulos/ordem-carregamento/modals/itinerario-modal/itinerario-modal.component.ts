import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OrdemCarregamento } from '../../models/ordem-carregamento';
import { ItinerarioPdfService } from '../../componentes/itinerario-pdf.component/itinerario-pdf.component';

@Component({
  selector: 'app-itinerario-modal',
  templateUrl: './itinerario-modal.component.html',
  styleUrls: ['./itinerario-modal.component.scss']
})
export class ItinerarioModalComponent {
  @Input() show: boolean = false;
  @Input() pedidos: any[] = [];
  @Input() ordemCarregamento: OrdemCarregamento | null = null;
  @Input() localidadesMap: Map<string, string> = new Map();
  @Input() businessPartner: any = null;
  @Output() showChange = new EventEmitter<boolean>();

  draggedItemIndex: number | null = null;

  constructor(private itinerarioPdfService: ItinerarioPdfService) {}

  fechar() {
    this.showChange.emit(false);
  }

  // --- Lógica de Drag and Drop Nativo ---
  onDragStart(index: number) {
    this.draggedItemIndex = index;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // Necessário para permitir o drop
  }

  onDrop(index: number) {
    if (this.draggedItemIndex !== null && this.draggedItemIndex !== index) {
      const movedItem = this.pedidos[this.draggedItemIndex];
      this.pedidos.splice(this.draggedItemIndex, 1);
      this.pedidos.splice(index, 0, movedItem);
    }
    this.draggedItemIndex = null;
  }

  gerarPdf() {
    if (this.ordemCarregamento) {
      this.itinerarioPdfService.gerarPdf(
        this.ordemCarregamento, 
        this.pedidos, 
        this.localidadesMap
      );
    }
  }
}