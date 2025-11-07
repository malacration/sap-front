import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { PdfCarregamentoService } from '../../service/pdf-carregamento.service';

@Component({
  selector: 'app-itinerario-pdf',
  templateUrl: './itinerario-pdf.component.html',
  styleUrls: ['./itinerario-pdf.component.scss']
})
export class ItinerarioPdfComponent implements OnChanges {
  @Input() pedidosOrdenados: any[] = [];
  @Input() ordemCarregamento: any;
  @Input() businessPartner: any;
  @Input() localidadesMap: Map<string, string> = new Map();

  @ViewChild('pdfPagesContainer', { static: false }) pdfPagesContainer: ElementRef;

  // LINHA ADICIONADA PARA CORRIGIR O ERRO
  paginatedPedidos: any[][] = [];

  // Reduzido para 4 para ter uma margem de segurança maior para o conteúdo
  itemsPerPage = 4;

  constructor(private pdfService: PdfCarregamentoService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidosOrdenados'] && this.pedidosOrdenados?.length > 0) {
      this.paginatePedidos();
    }
  }

  private paginatePedidos(): void {
    const pages = [];
    for (let i = 0; i < this.pedidosOrdenados.length; i += this.itemsPerPage) {
      pages.push(this.pedidosOrdenados.slice(i, i + this.itemsPerPage));
    }
    // Agora esta linha vai funcionar corretamente
    this.paginatedPedidos = pages;
  }
  
  public gerarPdf(): void {
    if (!this.pdfPagesContainer?.nativeElement) {
      console.error('Elemento container do PDF não encontrado.');
      return;
    }

    setTimeout(async () => {
      const pageNodes = this.pdfPagesContainer.nativeElement.querySelectorAll('.pdf-page');
      if (pageNodes.length === 0) {
        console.error('Nenhuma página para gerar PDF foi encontrada no DOM.');
        return;
      }
      
      await this.pdfService.gerarPdfMultiPagina(
        pageNodes,
        `itinerario_${this.ordemCarregamento?.DocEntry}.pdf`
      );
    }, 100);
  }
}