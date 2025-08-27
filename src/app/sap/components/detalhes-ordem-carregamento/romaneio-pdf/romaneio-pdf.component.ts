import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { Pdf2Service } from '../../../service/pdf-2.service';

@Component({
  selector: 'app-romaneio-pdf',
  templateUrl: './romaneio-pdf.component.html',
  styleUrls: ['./romaneio-pdf.component.scss']
})
export class RomaneioPdfComponent {
  @Input() pedidos: any[] = [];
  @Input() ordemCarregamento: any;
  @Input() businessPartner: any;
  @Input() localidadesMap: Map<string, string> = new Map();

  @ViewChild('pdfContent', { static: false }) pdfContent: ElementRef;

  constructor(private pdfService: Pdf2Service) {}

  gerarPdf(): void {
    if (!this.pdfContent?.nativeElement) {
      console.error('Elemento PDF content não encontrado.');
      return;
    }
    this.pdfService.gerarPdfDoElemento(
      this.pdfContent.nativeElement,
      `romaneio_${this.ordemCarregamento?.DocEntry}.pdf`
    );
  }

  // Agrupa itens por código para evitar duplicação
  getItensAgrupados(): any[] {
    const itensAgrupados = new Map();
    
    this.pedidos.forEach(pedido => {
      const key = `${pedido.ItemCode}-${pedido.Dscription}`;
      if (itensAgrupados.has(key)) {
        itensAgrupados.get(key).Quantity += pedido.Quantity;
        itensAgrupados.get(key).pedidos.push(pedido.DocNum);
      } else {
        itensAgrupados.set(key, {
          ItemCode: pedido.ItemCode,
          Dscription: pedido.Dscription,
          Quantity: pedido.Quantity,
          pedidos: [pedido.DocNum]
        });
      }
    });
    
    return Array.from(itensAgrupados.values());
  }
}