import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { OrdemCarregamento } from '../../models/ordem-carregamento';
import { ItinerarioPdfService } from '../../componentes/itinerario-pdf.component/itinerario-pdf.component';

@Component({
  selector: 'app-itinerario-modal',
  templateUrl: './itinerario-modal.component.html',
  styleUrls: ['./itinerario-modal.component.scss']
})
export class ItinerarioModalComponent implements OnChanges {
  @Input() show: boolean = false;
  @Input() pedidos: any[] = [];
  @Input() ordemCarregamento: OrdemCarregamento | null = null;
  @Input() localidadesMap: Map<string, string> = new Map();
  @Output() showChange = new EventEmitter<boolean>();

  pedidosAgrupados: any[] = [];
  
  // Variáveis de controle do Drag
  draggedItemIndex: number | null = null;
  dropTargetIndex: number | null = null;
  dropPosition: 'above' | 'below' | null = null;

  constructor(private itinerarioPdfService: ItinerarioPdfService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['show'] && this.show) || changes['pedidos']) {
      this.agruparPedidos();
    }
  }

  private agruparPedidos() {
    if (!this.pedidos) return;
    const agrupado = new Map<string, any>();

    this.pedidos.forEach(item => {
      const chave = item.DocNum || item.DocEntry;
      if (!agrupado.has(chave)) {
        agrupado.set(chave, { ...item, itens: [] });
      }
      agrupado.get(chave).itens.push(item);
    });

    this.pedidosAgrupados = Array.from(agrupado.values());
  }

  // --- Lógica de Drag and Drop ---

  onDragStart(index: number) {
    this.draggedItemIndex = index;
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault(); // Necessário para permitir o drop
    
    if (this.draggedItemIndex === index) {
      this.dropTargetIndex = null;
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseY = event.clientY;
    
    // Se o mouse estiver acima da metade da linha, a sombra fica em cima
    const threshold = rect.top + (rect.height / 2);
    
    this.dropTargetIndex = index;
    this.dropPosition = mouseY < threshold ? 'above' : 'below';
  }

  onDragLeave() {
    this.dropTargetIndex = null;
    this.dropPosition = null;
  }

  onDrop(index: number) {
    if (this.draggedItemIndex !== null && this.draggedItemIndex !== index) {
      const lista = [...this.pedidosAgrupados];
      const itemMovido = lista.splice(this.draggedItemIndex, 1)[0];
      
      const novoIndex = this.dropPosition === 'below' ? index : index;
      
      lista.splice(novoIndex, 0, itemMovido);
      this.pedidosAgrupados = lista;
    }
    this.limparDrag();
  }

  limparDrag() {
    this.draggedItemIndex = null;
    this.dropTargetIndex = null;
    this.dropPosition = null;
  }

  fechar() {
    this.showChange.emit(false);
  }

  gerarPdf() {
    if (this.ordemCarregamento) {
      this.itinerarioPdfService.gerarPdf(
        this.ordemCarregamento,
        this.pedidosAgrupados,
        this.localidadesMap
      );
    }
  }
}