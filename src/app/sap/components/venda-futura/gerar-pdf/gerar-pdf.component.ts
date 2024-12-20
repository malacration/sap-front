import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { PdfService } from '../../../service/pdf.service';
import { VendaFutura } from '../../../model/venda/venda-futura';

@Component({
  selector: 'app-gerar-pdf',
  templateUrl: './gerar-pdf.component.html',
  styleUrls: ['./gerar-pdf.component.scss']
})
export class GerarPdfComponent {

  @Input() vendaFutura: VendaFutura;
  @ViewChild('pdfContent', { static: false }) pdfContent: ElementRef;

  constructor(private pdfService: PdfService) {}

  gerarPdf(header) {

     // Pega o HTML do elemento referenciado pelo ViewChild
     const contentHtml = this.pdfContent.nativeElement.outerHTML;

     
     // Abre uma nova aba/janela
     const newWindow = window.open('', '_blank', 'width=600,height=400');
 
     // Escreve o conteúdo na nova aba/janela
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
 
     // Fecha o documento após a escrita
     newWindow.document.close();

    // const pdfElement = this.pdfContent.nativeElement;
  
    // const originalTransform = pdfElement.style.transform;
    // pdfElement.style.transform = 'none';
  
    // this.pdfService.gerarPdfDoElemento(pdfElement, 'venda-futura.pdf');
  
    // pdfElement.style.transform = originalTransform;
  }
}