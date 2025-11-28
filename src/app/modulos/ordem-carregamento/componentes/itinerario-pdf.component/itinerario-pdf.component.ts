import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, ChangeDetectorRef, OnInit } from '@angular/core';
import { PdfCarregamentoService } from '../../service/pdf-carregamento.service';

@Component({
  selector: 'app-itinerario-pdf',
  templateUrl: './itinerario-pdf.component.html',
  styleUrls: ['./itinerario-pdf.component.scss']
})
export class ItinerarioPdfComponent implements OnChanges, OnInit {
  @Input() pedidosOrdenados: any[] = [];
  @Input() ordemCarregamento: any;
  @Input() businessPartner: any;
  @Input() localidadesMap: Map<string, string> = new Map();

  @ViewChild('pdfPagesContainer', { static: false }) pdfPagesContainer: ElementRef;

  paginatedPedidos: any[][] = [];
  itemsPerPage = 4;

  // INJEÇÃO DO ChangeDetectorRef
  constructor(
    private pdfService: PdfCarregamentoService,
    private cdr: ChangeDetectorRef 
  ) {}

  // Adicionado ngOnInit para garantir carga inicial
  ngOnInit(): void {
    this.paginatePedidos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidosOrdenados']) {
      this.paginatePedidos();
    }
  }

  private paginatePedidos(): void {
    if (!this.pedidosOrdenados) return;

    const pages = [];
    for (let i = 0; i < this.pedidosOrdenados.length; i += this.itemsPerPage) {
      pages.push(this.pedidosOrdenados.slice(i, i + this.itemsPerPage));
    }
    this.paginatedPedidos = pages;
    
    // Força atualização da view caso o Angular não tenha percebido
    this.cdr.detectChanges(); 
  }
  
  public gerarPdf(): void {
    // 1. Garante que a paginação está atualizada
    this.paginatePedidos();

    // 2. Força a detecção de mudanças para que o *ngFor desenhe as divs .pdf-page no DOM
    this.cdr.detectChanges();

    if (!this.pdfPagesContainer?.nativeElement) {
      console.error('Elemento container do PDF não encontrado.');
      return;
    }

    // Aumentei um pouco o tempo para garantir renderização (200ms)
    setTimeout(async () => {
      const pageNodes = this.pdfPagesContainer.nativeElement.querySelectorAll('.pdf-page');
      
      console.log('Tentando gerar PDF. Páginas encontradas:', pageNodes.length);

      if (pageNodes.length === 0) {
        console.error('ERRO: O array paginatedPedidos tem tamanho:', this.paginatedPedidos.length);
        alert('Erro: O PDF não foi renderizado corretamente. Tente novamente.');
        return;
      }
      
      await this.pdfService.gerarPdfMultiPagina(
        pageNodes,
        `itinerario_${this.ordemCarregamento?.DocEntry || 'novo'}.pdf`
      );
    }, 200);
  }
}