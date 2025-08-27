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
  @Input() placa: string = '';
  @Input() nomeMotorista: string = '';

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

  getItensAgrupados(): any[] {
    const itensAgrupados = new Map();
    
    this.pedidos.forEach(pedido => {
      const key = `${pedido.ItemCode}-${pedido.Dscription}`;
      if (itensAgrupados.has(key)) {
        const existing = itensAgrupados.get(key);
        existing.Quantity += pedido.Quantity;
        existing.Peso += pedido.Quantity; // Por enquanto, Peso = Quantity; altere para pedido.Weight depois
        existing.pedidos.push(pedido.DocNum);
      } else {
        itensAgrupados.set(key, {
          ItemCode: pedido.ItemCode,
          Dscription: pedido.Dscription,
          Quantity: pedido.Quantity,
          Peso: pedido.Quantity, // Por enquanto, Peso = Quantity
          pedidos: [pedido.DocNum]
        });
      }
    });
    
    return Array.from(itensAgrupados.values());
  }

  getTotalQuantidade(): number {
    return this.getItensAgrupados().reduce((total, item) => total + item.Quantity, 0);
  }

  getTotalPeso(): number {
    return this.getItensAgrupados().reduce((total, item) => total + item.Peso, 0);
  }
}