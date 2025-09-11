import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { PdfCarregamentoService } from '../../../service/pdf-carregamento.service';

@Component({
  selector: 'app-itinerario-pdf',
  templateUrl: './itinerario-pdf.component.html',
  styleUrls: ['./itinerario-pdf.component.scss']
})
export class ItinerarioPdfComponent {
  @Input() pedidosOrdenados: any[] = [];
  @Input() ordemCarregamento: any;
  @Input() businessPartner: any;
  @Input() localidadesMap: Map<string, string> = new Map();

  @ViewChild('pdfContent', { static: false }) pdfContent: ElementRef;

  constructor(private pdfService: PdfCarregamentoService) {}

  gerarPdf(header: string): void {
    if (!this.pdfContent?.nativeElement) {
      console.error('Elemento PDF content não encontrado.');
      return;
    }
    this.pdfService.gerarPdfDoElemento(
      this.pdfContent.nativeElement,
      `itinerario_${this.ordemCarregamento?.DocEntry}.pdf`
    );
  }

  getUniqueLocalidades(): string[] {
    const uniqueLocalidades = new Set<string>();
  this.pedidosOrdenados.forEach(pedido => {
      const localidade = this.localidadesMap.get(pedido.CardCode) || 'Não informado';
      uniqueLocalidades.add(localidade);
    });
    return Array.from(uniqueLocalidades);
  }

  filterByLocalidade(pedidos: any[], localidade: string): any[] {
    return pedidos.filter(pedido => {
      const pedidoLocalidade = this.localidadesMap.get(pedido.CardCode) || 'Não informado';
      return pedidoLocalidade == localidade;
    });
  }
}