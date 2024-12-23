import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { PdfService } from '../../../service/pdf.service';
import { VendaFutura } from '../../../model/venda/venda-futura';
import { BusinessPartner } from '../../../model/business-partner/business-partner';

@Component({
  selector: 'app-gerar-pdf',
  templateUrl: './gerar-pdf.component.html',
  styleUrls: ['./gerar-pdf.component.scss']
})
export class GerarPdfComponent {

  @Input() vendaFutura: VendaFutura;
  @Input() businessPartner: BusinessPartner;
  @ViewChild('pdfContent', { static: false }) pdfContent: ElementRef;

  constructor(private pdfService: PdfService) {}

  gerarPdf(header: string): void {
    if (!this.pdfContent?.nativeElement) {
      console.error('Elemento PDF content não encontrado.');
      return;
    }

    const contentHtml = this.pdfContent.nativeElement.outerHTML;

    const newWindow = window.open('', '_blank', 'width=600,height=400');
    if (!newWindow) {
      console.error('Não foi possível abrir uma nova janela para exibir o PDF.');
      return;
    }

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          ${header}
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);

    newWindow.document.close();
  }
}