import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root',
})
export class PdfCarregamentoService {

  async gerarPdfMultiPagina(elements: NodeListOf<HTMLElement>, fileName: string): Promise<void> {
    
    // PASSO 1: Abrir a janela IMEDIATAMENTE, antes de qualquer operação demorada.
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Não foi possível abrir a pré-visualização do PDF. Verifique se o seu navegador está a bloquear pop-ups.');
      return;
    }

    // Escreve uma mensagem de "loading" na nova janela.
    newWindow.document.write(`
      <html>
        <head><title>A Gerar PDF...</title></head>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px; color: #333;">
          <h2>Aguarde, a processar o seu documento...</h2>
          <p>Este processo pode demorar alguns segundos.</p>
          <p style="font-size: 2rem;">&#8987;</p>
        </body>
      </html>
    `);

    try {
      // PASSO 2: Iniciar o processo demorado de gerar o PDF.
      const a4Width = 794;
      const a4Height = 1122;
      const margin = 40;

      const pdf = new jsPDF('p', 'px', [a4Width, a4Height]);
      const options = {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      };

      for (let i = 0; i < elements.length; i++) {
        const pageElement = elements[i];
        const canvas = await html2canvas(pageElement, options);

        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL('image/png', 0.9);
        const imgWidth = a4Width - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      }

      // PASSO 3: Quando o PDF estiver pronto, criar a URL e carregar na janela já aberta.
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Atualiza a localização da janela para exibir o PDF.
      newWindow.location.href = pdfUrl;

    } catch (error) {
      // Em caso de erro, exibe uma mensagem na janela de pop-up.
      newWindow.document.body.innerHTML = `
        <div style="color: red; border: 2px solid red; padding: 20px;">
          <h2>Ocorreu um erro ao gerar o PDF.</h2>
          <p>Por favor, feche esta janela e tente novamente. Detalhes do erro:</p>
          <pre>${(error as Error).message}</pre>
        </div>
      `;
      console.error("Erro ao gerar PDF:", error);
    }
  }
}