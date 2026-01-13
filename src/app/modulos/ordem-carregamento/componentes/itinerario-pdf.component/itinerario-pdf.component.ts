import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { OrdemCarregamento } from '../../models/ordem-carregamento';

@Injectable({ providedIn: 'root' })
export class ItinerarioPdfService {
  private readonly VERDE_SUSTEN: [number, number, number] = [0, 155, 58];
  private readonly VERDE_CLARO_BG: [number, number, number] = [235, 247, 238];
  private readonly CINZA_LINHA: [number, number, number] = [220, 220, 220];
  private readonly PRETO_TEXTO: [number, number, number] = [30, 30, 30];

  constructor() {}

  private carregarLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = 'assets/logo.png'; 
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  }

  async gerarPdf(ordem: OrdemCarregamento, pedidosAgrupados: any[], localidadesMap: Map<string, string>) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 10;
    let cursorY = 10;

    const logoImg = await this.carregarLogo();

    const desenharCabecalho = () => {
      cursorY = 10;
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', marginX, cursorY - 3, 25, 10);
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.text('ITINERÁRIO DE ENTREGA', pageW - marginX, cursorY + 5, { align: 'right' });

      cursorY += 10;
      doc.setDrawColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.setLineWidth(0.5);
      doc.line(marginX, cursorY, pageW - marginX, cursorY);
      cursorY += 5;
    };

    desenharCabecalho();

    // Bloco Superior
    const alturaBlocoVerde = 18;
    doc.setFillColor(this.VERDE_CLARO_BG[0], this.VERDE_CLARO_BG[1], this.VERDE_CLARO_BG[2]);
    doc.roundedRect(marginX, cursorY, pageW - (marginX * 2), alturaBlocoVerde, 1, 1, 'F');
    
    doc.setFontSize(9);
    this.escreverCampo(doc, 'Ordem:', ordem.DocEntry.toString(), marginX + 3, cursorY + 7, true);
    this.escreverCampo(doc, 'Data:', ordem.dataCriacao || '', marginX + 3, cursorY + 13, true);
    
    const col2 = (pageW / 2);
    this.escreverCampo(doc, 'Descrição:', ordem.U_nameOrdem || 'N/I', col2, cursorY + 7, true);
    this.escreverCampo(doc, 'Status:', 'Aberto', col2, cursorY + 13, true);
    
    cursorY += alturaBlocoVerde + 5;

    pedidosAgrupados.forEach((pedido, index) => {
      doc.setFontSize(8);
      const larguraTexto = pageW - (marginX * 2) - 10;
      const enderecoLinhas = doc.splitTextToSize(pedido.Address2 || 'ENDEREÇO NÃO CADASTRADO', larguraTexto);
      const obsLinhas = doc.splitTextToSize(pedido.Comments || 'SEM OBSERVAÇÕES', larguraTexto);
      
      const alturaEstimada = 25 + (enderecoLinhas.length * 4) + (obsLinhas.length * 4) + (pedido.itens.length * 6);

      if (cursorY + alturaEstimada > pageH - 25) {
        doc.addPage();
        desenharCabecalho();
      }

      const seqStartY = cursorY;
      
      // Header da Parada
      doc.setFillColor(245, 245, 245);
      doc.rect(marginX, cursorY, pageW - (marginX * 2), 6, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.text(`Parada ${index + 1}`, marginX + 2, cursorY + 4.5);
      doc.text(`Pedido: ${pedido.DocNum || pedido.DocEntry}`, pageW - marginX - 2, cursorY + 4.5, { align: 'right' });
      
      cursorY += 10;
      doc.setTextColor(this.PRETO_TEXTO[0], this.PRETO_TEXTO[1], this.PRETO_TEXTO[2]);
      
      this.escreverCampo(doc, 'Cliente:', `${pedido.CardName} (${pedido.CardCode})`, marginX + 3, cursorY);
      cursorY += 4;
      this.escreverCampo(doc, 'Localidade:', localidadesMap.get(pedido.CardCode) || 'N/I', marginX + 3, cursorY);
      cursorY += 4;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Endereço:', marginX + 3, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.text(enderecoLinhas, marginX + 20, cursorY);
      cursorY += (enderecoLinhas.length * 3.8) + 1;
      
      this.escreverCampo(doc, 'Vendedor:', pedido.SlpName, marginX + 3, cursorY);
      const contato = pedido.Mobil || pedido.Telephone || 'N/I';
      this.escreverCampo(doc, 'Contato:', contato, col2, cursorY);
      cursorY += 4;

      doc.setFont('helvetica', 'bold');
      doc.text('Obs:', marginX + 3, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.text(obsLinhas, marginX + 12, cursorY);
      cursorY += (obsLinhas.length * 3.8) + 3;

      // LISTAGEM DE ITENS COM DIVISÓRIAS
      pedido.itens.forEach((item: any, idxItem: number) => {
        if (idxItem === 0) {
          // Linha VERDE para o primeiro produto
          doc.setDrawColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
          doc.setLineWidth(0.3);
          doc.line(marginX + 3, cursorY - 2.5, pageW - marginX - 3, cursorY - 2.5);
        } else {
          // Linha PRETA fina para os demais produtos
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.1);
          doc.line(marginX + 3, cursorY - 2.5, pageW - marginX - 3, cursorY - 2.5);
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Produto:', marginX + 3, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${item.ItemCode} - ${item.Dscription}`, marginX + 17, cursorY);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Qtd:', pageW - 40, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${item.Quantity} ${item.UomCode || 'UN'}`, pageW - 32, cursorY);
        
        cursorY += 4.5; // Espaçamento entre produtos mais curto
      });

      // Moldura da Parada
      doc.setDrawColor(this.CINZA_LINHA[0]);
      doc.setLineWidth(0.2);
      doc.roundedRect(marginX, seqStartY, pageW - (marginX * 2), cursorY - seqStartY + 1, 1, 1, 'S');
      cursorY += 5; 
    });

    this.desenharRodape(doc, pageW, pageH, marginX);
    doc.save(`Itinerario_Ordem_${ordem.DocEntry}.pdf`);
  }

  private escreverCampo(doc: jsPDF, label: string, valor: string, x: number, y: number, destaqueLabel = false) {
    doc.setFont('helvetica', 'bold');
    if (destaqueLabel) {
        doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    } else {
        doc.setTextColor(this.PRETO_TEXTO[0], this.PRETO_TEXTO[1], this.PRETO_TEXTO[2]);
    }
    doc.text(label, x, y);
    
    const labelW = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.PRETO_TEXTO[0], this.PRETO_TEXTO[1], this.PRETO_TEXTO[2]);
    doc.text(String(valor), x + labelW + 1.5, y);
  }

  private desenharRodape(doc: jsPDF, pageW: number, pageH: number, marginX: number) {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      
      const footerY = pageH - 12;
      doc.setDrawColor(200);
      doc.line(marginX, footerY, marginX + 50, footerY);
      doc.text('Assinatura Motorista', marginX, footerY + 3);
      
      doc.line(pageW - marginX - 50, footerY, pageW - marginX, footerY);
      doc.text('Conferência Logística', pageW - marginX, footerY + 3, { align: 'right' });
      
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 5, { align: 'center' });
    }
  }
}