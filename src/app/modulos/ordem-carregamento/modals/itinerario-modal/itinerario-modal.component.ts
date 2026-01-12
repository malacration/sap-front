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
  @Input() pedidos: any[] = []; // Itens vindos da ordem
  @Input() ordemCarregamento: OrdemCarregamento | null = null;
  @Input() localidadesMap: Map<string, string> = new Map();
  @Input() businessPartner: any = null;
  @Output() showChange = new EventEmitter<boolean>();

  pedidosAgrupados: any[] = [];
  draggedItemIndex: number | null = null;

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
        agrupado.set(chave, {
          DocNum: item.DocNum,
          DocEntry: item.DocEntry,
          CardCode: item.CardCode,
          CardName: item.CardName,
          Address2: item.Address2,
          SlpName: item.SlpName,
          Mobil: item.Mobil,
          Telephone: item.Telephone,
          itens: [] 
        });
      }
      agrupado.get(chave).itens.push(item);
    });

    this.pedidosAgrupados = Array.from(agrupado.values());
  }

  fechar() {
    this.showChange.emit(false);
  }

  onDragStart(index: number) {
    this.draggedItemIndex = index;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(index: number) {
    if (this.draggedItemIndex !== null && this.draggedItemIndex !== index) {
      const movedItem = this.pedidosAgrupados[this.draggedItemIndex];
      this.pedidosAgrupados.splice(this.draggedItemIndex, 1);
      this.pedidosAgrupados.splice(index, 0, movedItem);
    }
    this.draggedItemIndex = null;
  }

  gerarPdf() {
    if (this.ordemCarregamento) {
      this.itinerarioPdfService.gerarPdf(
        this.ordemCarregamento,
        this.pedidosAgrupados, // Passa a lista na ordem definida pelo usuário
        this.localidadesMap
      );
    }
  }
}