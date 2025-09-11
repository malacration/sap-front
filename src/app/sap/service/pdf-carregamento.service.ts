import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root',
})
export class PdfCarregamentoService {
  gerarPdfDoElemento(element: HTMLElement, fileName: string) {
    const a4Width = 794;
    const a4Height = 1122;

    const options = {
      scale: 2, // Escala reduzida para otimizar tamanho e performance
      useCORS: true,
    };

    html2canvas(element, options).then((canvas) => {
      const imgData = canvas.toDataURL('image/png', 0.8); // Qualidade de 80% para reduzir tamanho
      const pdf = new jsPDF('p', 'px', [a4Width, a4Height]);

      const margin = 20;
      pdf.addImage(imgData, 'PNG', margin, margin, a4Width - 2 * margin, a4Height - 2 * margin);

      // Gera o blob do PDF
      const pdfBlob = pdf.output('blob');

      // Cria uma URL para o blob
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Abre uma nova aba about:blank
      const newWindow = window.open('about:blank', '_blank');
      if (!newWindow) {
        console.error('Não foi possível abrir uma nova janela.');
        return;
      }

      // Exibe o PDF na nova aba usando um elemento <embed>
      newWindow.document.write(`
        <html>
          <head>
            <title>Preview do Itinerário ${fileName}</title>
            <style>
              body { margin: 0; overflow: hidden; }
              embed { width: 100%; height: 100vh; }
            </style>
          </head>
          <body>
            <embed src="${pdfUrl}" type="application/pdf">
          </body>
        </html>
      `);
      newWindow.document.close();
    });
  }
}