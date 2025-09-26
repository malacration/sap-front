import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { PdfCarregamentoService } from '../../../service/pdf-carregamento.service';

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
  itemsPerPage: number = 20; // Ajustado para 20 itens por página

  constructor(private pdfService: PdfCarregamentoService) {}

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

    // Paginação com 20 itens por página
    const pages = [];
    for (let i = 0; i < this.itensAgrupados.length; i += this.itemsPerPage) {
      pages.push(this.itensAgrupados.slice(i, i + this.itemsPerPage));
    }
    this.paginatedItens = pages;
  }
  
  public gerarPdf(): void {
    if (!this.pdfPagesContainer?.nativeElement) {
      console.error('Elemento container do PDF não encontrado.');
      return;
    }

    setTimeout(async () => {
      const pageNodes = this.pdfPagesContainer.nativeElement.querySelectorAll('.pdf-page');
      if (pageNodes.length === 0) {
        console.error('Nenhuma página para gerar PDF foi encontrada.');
        return;
      }
      await this.pdfService.gerarPdfMultiPagina(
        pageNodes,
        `romaneio_${this.ordemCarregamento?.DocEntry}.pdf`
      );
    }, 100);
  }

  getTotalQuantidade(): number {
    return this.itensAgrupados.reduce((total, item) => total + item.Quantity, 0);
  }

  getTotalPeso(): number {
    return this.itensAgrupados.reduce((total, item) => total + item.Peso, 0);
  }
}