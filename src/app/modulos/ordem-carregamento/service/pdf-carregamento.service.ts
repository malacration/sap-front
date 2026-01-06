import { Injectable } from '@angular/core';
import jsPDF from 'jspdf'; 
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root',
})
export class PdfCarregamentoService {

  async gerarPdfMultiPagina(elements: NodeListOf<HTMLElement>, fileName: string): Promise<void> {
    
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Não foi possível abrir a pré-visualização do PDF. Verifique se o seu navegador está a bloquear pop-ups.');
      return;
    }

    newWindow.document.write(`
      <html>
        <head><title>Gerando PDF...</title></head>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px; color: #333;">
          <h2>Aguarde, processando documento em Alta Definição...</h2>
          <p>Este processo pode demorar alguns segundos devido à qualidade da imagem.</p>
          <p style="font-size: 2rem;">&#8987;</p>
        </body>
      </html>
    `);

    try {
      const a4Width = 794; 
      const a4Height = 1122;
      const margin = 30; 

      const pdf = new jsPDF('p', 'px', [a4Width, a4Height]);
      
      const options = {
        scale: 4, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false, 
        windowWidth: a4Width 
      };

      for (let i = 0; i < elements.length; i++) {
        const pageElement = elements[i];
        
        pageElement.style.backgroundColor = '#ffffff';

        const canvas = await html2canvas(pageElement, options);

        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL('image/png', 1.0);
        
        const imgWidth = a4Width - (2 * margin); 
        const pageHeight = a4Height - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      }

      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      newWindow.location.href = pdfUrl;

    } catch (error) {
      newWindow.document.body.innerHTML = `
        <div style="color: red; border: 2px solid red; padding: 20px;">
          <h2>Ocorreu um erro ao gerar o PDF.</h2>
          <pre>${(error as Error).message}</pre>
        </div>
      `;
      console.error("Erro ao gerar PDF:", error);
    }
  }
}