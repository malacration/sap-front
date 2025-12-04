import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ItinerarioPdfComponent } from '../../componentes/itinerario-pdf.component/itinerario-pdf.component';

@Component({
  selector: 'app-itinerario-modal',
  templateUrl: './itinerario-modal.component.html'
})
export class ItinerarioModalComponent implements OnChanges {
  @Input() show: boolean = false;
  @Input() pedidos: any[] = [];
  @Input() ordemCarregamento: any;
  @Input() businessPartner: any;
  @Input() localidadesMap: Map<string, string> = new Map();
  
  @Output() showChange = new EventEmitter<boolean>();

  pedidosOrdenados: any[] = [];
  draggedIndex: number | null = null;
  placeholder: HTMLTableRowElement | null = null;

  @ViewChild('tableResponsive') tableResponsive: ElementRef;
  @ViewChild(ItinerarioPdfComponent) pdfComponent: ItinerarioPdfComponent;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidos'] && this.pedidos) {
      this.resetarOrdem();
    }
  }

  fecharModal() {
    this.showChange.emit(false);
  }

  resetarOrdem() {
    this.pedidosOrdenados = [...this.pedidos];
  }

  gerarPDF() {
    if (this.pdfComponent) {
        this.pdfComponent.gerarPdf();
    }
  }

  onDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    event.dataTransfer!.setData('text/plain', index.toString());
    event.dataTransfer!.effectAllowed = 'move';
    (event.target as HTMLElement).classList.add('dragging');
    
    this.placeholder = document.createElement('tr');
    this.placeholder.classList.add('placeholder');
    this.placeholder.innerHTML = '<td colspan="7"></td>';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('dragging');
    this.placeholder?.remove();
    this.placeholder = null;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.draggedIndex === null) return;
    
    const movedItem = this.pedidosOrdenados.splice(this.draggedIndex, 1)[0];
    this.pedidosOrdenados.push(movedItem); 
    
    this.draggedIndex = null;
    this.placeholder?.remove();
  }
}