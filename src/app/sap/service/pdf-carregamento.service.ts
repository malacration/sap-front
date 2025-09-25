import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root',
})
export class PdfCarregamentoService {

  /**
   * Gera um PDF de múltiplas páginas a partir de uma lista de elementos HTML.
   * Cada elemento da lista será renderizado em uma página separada do PDF.
   * @param elements Uma NodeListOf<HTMLElement> contendo os elementos de cada página.
   * @param fileName O nome do ficheiro PDF a ser gerado.
   */
  async gerarPdfMultiPagina(elements: NodeListOf<HTMLElement>, fileName: string): Promise<void> {
    const a4Width = 794; // Largura A4 em pixels (aproximadamente 210mm a 96dpi)
    const a4Height = 1122; // Altura A4 em pixels (aproximadamente 297mm a 96dpi)
    const margin = 40; // Margem em pixels

    const pdf = new jsPDF('p', 'px', [a4Width, a4Height]);

    const options = {
      scale: 2, // Aumenta a resolução da captura
      useCORS: true,
      backgroundColor: '#ffffff',
    };

    // Usamos um loop for...of com await para garantir que as páginas sejam processadas em ordem
    for (let i = 0; i < elements.length; i++) {
      const pageElement = elements[i];
      const canvas = await html2canvas(pageElement, options);

      // Adiciona uma nova página APÓS a primeira iteração
      if (i > 0) {
        pdf.addPage();
      }

      const imgData = canvas.toDataURL('image/png', 0.9); // Qualidade da imagem
      const imgWidth = a4Width - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Adiciona a imagem capturada à página atual do PDF
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    }

    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
      console.error('Não foi possível abrir uma nova janela. Verifique bloqueadores de pop-up.');
      alert('Não foi possível abrir a pré-visualização do PDF. Verifique se o seu navegador está a bloquear pop-ups.');
      return;
    }

    // Exibe o PDF na nova aba
    newWindow.document.write(`
      <html>
        <head>
          <title>Preview: ${fileName}</title>
          <style>
            body { margin: 0; overflow: hidden; }
            embed { position: absolute; top: 0; left: 0; width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <embed src="${pdfUrl}" type="application/pdf">
        </body>
      </html>
    `);
    newWindow.document.close();
  }
}