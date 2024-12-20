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
    this.pdfService.gerarPdfDoElemento(this.pdfContent.nativeElement, 'venda-futura.pdf');
  }
}