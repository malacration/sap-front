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

  gerarPdf() {
    const pdfElement = this.pdfContent.nativeElement;
  
    const originalTransform = pdfElement.style.transform;
    pdfElement.style.transform = 'none';
  
    this.pdfService.gerarPdfDoElemento(pdfElement, 'venda-futura.pdf');
  
    pdfElement.style.transform = originalTransform;
  }
}