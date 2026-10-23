import { Injectable } from '@angular/core';
import jsPDF from 'jspdf/dist/jspdf.umd';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root',
})
export class PdfService {

  /**
   * Gera e BAIXA o PDF do elemento em A4 sem esticar. Por padrao quebra em quantas paginas precisar;
   * com umaPagina, se passar da altura do A4 reduz tudo na mesma proporcao para caber numa so.
   * Renderiza uma copia fora da tela, na largura de A4: o original pode estar dentro de um modal com
   * rolagem, e o html2canvas cortava o que estava fora da area visivel. Os estilos do componente
   * continuam valendo na copia (os atributos _ngcontent vao junto no cloneNode).
   */
  async baixarPdfPaginado(element: HTMLElement, fileName: string, umaPagina = false): Promise<void> {
    const larguraA4Px = 794
    const copia = element.cloneNode(true) as HTMLElement
    const area = document.createElement('div')
    area.style.cssText = `position:fixed;left:-10000px;top:0;width:${larguraA4Px}px;background:#fff;`
    area.appendChild(copia)
    document.body.appendChild(area)
    try {
      //imageTimeout: imagem que nao carrega nao pode segurar o botao por 15s (padrao do html2canvas)
      const canvas = await html2canvas(copia, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: larguraA4Px, imageTimeout: 5000 })
      const pdf = new jsPDF('p', 'mm', 'a4')
      const margem = 10
      const larguraUtil = pdf.internal.pageSize.getWidth() - 2 * margem
      const alturaUtil = pdf.internal.pageSize.getHeight() - 2 * margem
      if (umaPagina) {
        const alturaImagem = canvas.height * larguraUtil / canvas.width
        const escala = Math.min(1, alturaUtil / alturaImagem)
        const largura = larguraUtil * escala
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margem + (larguraUtil - largura) / 2, margem, largura, alturaImagem * escala)
        pdf.save(fileName)
        return
      }
      //quantos pixels do canvas cabem na altura util de uma pagina, mantendo a proporcao
      const alturaPaginaPx = Math.floor(canvas.width * alturaUtil / larguraUtil)
      for (let topo = 0, pagina = 0; topo < canvas.height; topo += alturaPaginaPx, pagina++) {
        const alturaFatia = Math.min(alturaPaginaPx, canvas.height - topo)
        const fatia = document.createElement('canvas')
        fatia.width = canvas.width
        fatia.height = alturaFatia
        fatia.getContext('2d').drawImage(canvas, 0, topo, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia)
        if (pagina > 0)
          pdf.addPage()
        pdf.addImage(fatia.toDataURL('image/png'), 'PNG', margem, margem, larguraUtil, alturaFatia * larguraUtil / canvas.width)
      }
      pdf.save(fileName)
    } finally {
      document.body.removeChild(area)
    }
  }

  /** Nome de arquivo sem os caracteres que Windows/Mac recusam. */
  static nomeArquivo(nome: string): string {
    return nome.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
  }

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
