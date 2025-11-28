import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { PdfCarregamentoService } from '../../service/pdf-carregamento.service';

@Component({
  selector: 'app-romaneio-pdf',
  templateUrl: './romaneio-pdf.component.html',
  styleUrls: ['./romaneio-pdf.component.scss']
})
export class RomaneioPdfComponent implements OnChanges {
  @Input() pedidos: any[] = [];
  @Input() ordemCarregamento: any;
  @Input() businessPartner: any;
  @Input() localidadesMap: Map<string, string> = new Map();
  @Input() placa: string = '';
  @Input() nomeMotorista: string = '';

  @ViewChild('pdfPagesContainer', { static: false }) pdfPagesContainer: ElementRef;

  itensAgrupados: any[] = [];
  paginatedItens: any[][] = [];
  itemsPerPage: number = 20;

  // 1. INJEÇÃO DO ChangeDetectorRef
  constructor(
    private pdfService: PdfCarregamentoService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedidos'] && this.pedidos?.length > 0) {
      this.agruparEpaginarItens();
    }
  }

  private agruparEpaginarItens(): void {
    const itensMap = new Map();

    this.pedidos.forEach(pedido => {
      const key = pedido.ItemCode;
      if (itensMap.has(key)) {
        const existing = itensMap.get(key);
        existing.Quantity += pedido.Quantity;
        existing.Peso += (pedido.Quantity * (pedido.Weight1 || 0));
      } else {
        itensMap.set(key, {
          ItemCode: pedido.ItemCode,
          Dscription: pedido.Dscription,
          Quantity: pedido.Quantity,
          Peso: pedido.Quantity * (pedido.Weight1 || 0),
        });
      }
    });
    this.itensAgrupados = Array.from(itensMap.values());

    const pages = [];
    for (let i = 0; i < this.itensAgrupados.length; i += this.itemsPerPage) {
      pages.push(this.itensAgrupados.slice(i, i + this.itemsPerPage));
    }
    this.paginatedItens = pages;
    
    this.cdr.detectChanges();
  }
  
  public gerarPdf(): void {
    this.agruparEpaginarItens();
    
    if (!this.pdfPagesContainer?.nativeElement) {
      console.error('Elemento container do PDF não encontrado.');
      return;
    }

    setTimeout(async () => {
      const pageNodes = this.pdfPagesContainer.nativeElement.querySelectorAll('.pdf-page');
      if (pageNodes.length === 0) {
        console.error('Nenhuma página encontrada.');
        return;
      }
      await this.pdfService.gerarPdfMultiPagina(
        pageNodes,
        `romaneio_${this.ordemCarregamento?.DocEntry || 'doc'}.pdf`
      );
    }, 200);
  }

  getTotalQuantidade(): number {
    return this.itensAgrupados.reduce((total, item) => total + item.Quantity, 0);
  }

  getTotalPeso(): number {
    return this.itensAgrupados.reduce((total, item) => total + item.Peso, 0);
  }
}