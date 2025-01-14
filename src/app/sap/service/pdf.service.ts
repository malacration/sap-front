import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  gerarPdfDoElemento(element: HTMLElement, fileName: string) {
    const a4Width = 794; 
    const a4Height = 1122; 

    const options = {
      scale: 3, 
      useCORS: true, 
    };

    html2canvas(element, options).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'px', [a4Width, a4Height]);

      const margin = 20; 
      pdf.addImage(imgData, 'PNG', margin, margin, a4Width - 2 * margin, a4Height - 2 * margin);
      pdf.save(fileName);
    });
  }
}