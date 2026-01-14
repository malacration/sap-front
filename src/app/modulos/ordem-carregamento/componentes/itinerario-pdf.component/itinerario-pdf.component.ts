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

  private formatDecimal(value: any): string {
    return (Number(value) || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  private carregarLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = 'logo.png'; 
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

    let totalGeralQtd = 0;
    let totalGeralPeso = 0;
    pedidosAgrupados.forEach(p => {
      p.itens.forEach((i: any) => {
        totalGeralQtd += Number(i.Quantity || 0);
        totalGeralPeso += (Number(i.Quantity || 0) * Number(i.Weight1 || 0));
      });
    });

    const logoImg = await this.carregarLogo();

    const desenharCabecalho = () => {
      cursorY = 10;
      if (logoImg) doc.addImage(logoImg, 'PNG', marginX, cursorY - 3, 25, 10);
      doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(...this.VERDE_SUSTEN);
      doc.text('ITINERÁRIO DE ENTREGA', pageW - marginX, cursorY + 5, { align: 'right' });
      cursorY += 10;
      doc.setDrawColor(...this.VERDE_SUSTEN).setLineWidth(0.5).line(marginX, cursorY, pageW - marginX, cursorY);
      cursorY += 5;
    };

    desenharCabecalho();

    const col2 = (pageW / 2);
    const larguraMaxDesc = (pageW / 2) - marginX - 5;
    const descLinhas = doc.splitTextToSize(ordem.U_nameOrdem || 'N/I', larguraMaxDesc);
    const alturaExtraDesc = (descLinhas.length - 1) * 3.5;
    const alturaBlocoVerde = 24 + alturaExtraDesc;

    doc.setFillColor(...this.VERDE_CLARO_BG).roundedRect(marginX, cursorY, pageW - (marginX * 2), alturaBlocoVerde, 1, 1, 'F');
    doc.setFontSize(9);
    
    this.escreverCampo(doc, 'Ordem:', ordem.DocEntry.toString(), marginX + 3, cursorY + 6, true);
    
    doc.setFont('helvetica', 'bold').setTextColor(...this.VERDE_SUSTEN);
    doc.text('Descrição:', col2, cursorY + 6);
    const labelW = doc.getTextWidth('Descrição: ');
    doc.setFont('helvetica', 'normal').setTextColor(...this.PRETO_TEXTO);
    doc.text(descLinhas, col2 + labelW, cursorY + 6);

    this.escreverCampo(doc, 'Data:', ordem.dataCriacao || '', marginX + 3, cursorY + 12 + alturaExtraDesc, true);
    this.escreverCampo(doc, 'Status:', 'Aberto', col2, cursorY + 12 + alturaExtraDesc, true);
    
    doc.setDrawColor(...this.VERDE_SUSTEN).setLineWidth(0.1).line(marginX + 3, cursorY + 15 + alturaExtraDesc, pageW - marginX - 3, cursorY + 15 + alturaExtraDesc);
    this.escreverCampo(doc, 'Total Geral Qtd:', totalGeralQtd.toString(), marginX + 3, cursorY + 20 + alturaExtraDesc, true);
    this.escreverCampo(doc, 'Total Geral Peso:', this.formatDecimal(totalGeralPeso) + ' kg', col2, cursorY + 20 + alturaExtraDesc, true);
    
    cursorY += alturaBlocoVerde + 5;

    pedidosAgrupados.forEach((pedido, index) => {
      let totalParadaQtd = 0;
      let totalParadaPeso = 0;

      doc.setFontSize(8);
      const larguraTexto = pageW - (marginX * 2) - 10;
      const enderecoLinhas = doc.splitTextToSize(pedido.Address2 || 'ENDEREÇO NÃO CADASTRADO', larguraTexto);
      const obsLinhas = doc.splitTextToSize(pedido.Comments || 'SEM OBSERVAÇÕES', larguraTexto);
      const alturaEstimada = 45 + (enderecoLinhas.length * 4) + (obsLinhas.length * 4) + (pedido.itens.length * 10);

      if (cursorY + alturaEstimada > pageH - 25) {
        doc.addPage();
        desenharCabecalho();
      }

      const seqStartY = cursorY;
      doc.setFillColor(245, 245, 245).rect(marginX, cursorY, pageW - (marginX * 2), 6, 'F');
      doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...this.VERDE_SUSTEN);
      doc.text(`Parada ${index + 1}`, marginX + 2, cursorY + 4.5);
      doc.text(`Pedido: ${pedido.DocNum || pedido.DocEntry}`, pageW - marginX - 2, cursorY + 4.5, { align: 'right' });
      
      cursorY += 10;
      doc.setTextColor(...this.PRETO_TEXTO);
      this.escreverCampo(doc, 'Cliente:', `${pedido.CardName} (${pedido.CardCode})`, marginX + 3, cursorY);
      cursorY += 4;
      this.escreverCampo(doc, 'Localidade:', localidadesMap.get(pedido.CardCode) || 'N/I', marginX + 3, cursorY);
      cursorY += 4;
      
      doc.setFont('helvetica', 'bold').text('Endereço:', marginX + 3, cursorY);
      doc.setFont('helvetica', 'normal').text(enderecoLinhas, marginX + 20, cursorY);
      cursorY += (enderecoLinhas.length * 3.8) + 1;
      
      this.escreverCampo(doc, 'Vendedor:', pedido.SlpName, marginX + 3, cursorY);
      this.escreverCampo(doc, 'Contato:', pedido.Mobil || pedido.Telephone || 'N/I', col2, cursorY);
      cursorY += 4;

      doc.setFont('helvetica', 'bold').text('Obs:', marginX + 3, cursorY);
      doc.setFont('helvetica', 'normal').text(obsLinhas, marginX + 12, cursorY);
      cursorY += (obsLinhas.length * 3.8) + 1.5; 

      pedido.itens.forEach((item: any, idxItem: number) => {
        const pesoLinha = (Number(item.Quantity || 0) * Number(item.Weight1 || 0));
        totalParadaQtd += Number(item.Quantity || 0);
        totalParadaPeso += pesoLinha;

        if (idxItem === 0) {
          doc.setDrawColor(...this.VERDE_SUSTEN).setLineWidth(0.4).line(marginX + 3, cursorY, pageW - marginX - 3, cursorY);
          cursorY += 6; 
        } else {
          cursorY += 5; 
        }

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold').text('Prod:', marginX + 3, cursorY);
        doc.setFont('helvetica', 'normal').text(`${item.ItemCode} - ${item.Dscription}`, marginX + 11, cursorY);
        
        this.escreverCampo(doc, 'Qtd:', String(item.Quantity), pageW - 85, cursorY);
        this.escreverCampo(doc, 'Peso:', this.formatDecimal(pesoLinha) + ' kg', pageW - 65, cursorY);
        this.escreverCampo(doc, 'U.M:', item.UomCode || 'UN', pageW - 28, cursorY);
      });

      cursorY += 6;
      doc.setFillColor(250, 250, 250).rect(marginX + 2, cursorY - 4, pageW - (marginX * 2) - 4, 6, 'F');
      doc.setDrawColor(...this.CINZA_LINHA).line(marginX + 3, cursorY - 4, pageW - marginX - 3, cursorY - 4);
      doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(...this.VERDE_SUSTEN);
      doc.text('TOTAL DA PARADA:', marginX + 5, cursorY);
      this.escreverCampo(doc, 'Qtd:', totalParadaQtd.toString(), pageW - 85, cursorY, true);
      this.escreverCampo(doc, 'Peso:', this.formatDecimal(totalParadaPeso) + ' kg', pageW - 65, cursorY, true);

      cursorY += 6;
      doc.setDrawColor(...this.CINZA_LINHA).setLineWidth(0.2).roundedRect(marginX, seqStartY, pageW - (marginX * 2), cursorY - seqStartY, 1, 1, 'S');
      cursorY += 6; 
    });

    this.desenharRodape(doc, pageW, pageH, marginX);
    doc.save(`Itinerario_Ordem_${ordem.DocEntry}.pdf`);
  }

  private escreverCampo(doc: jsPDF, label: string, valor: string, x: number, y: number, destaqueLabel = false) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(destaqueLabel ? this.VERDE_SUSTEN : this.PRETO_TEXTO));
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal').setTextColor(...this.PRETO_TEXTO);
    doc.text(String(valor), x + labelW + 1.2, y);
  }

  private desenharRodape(doc: jsPDF, pageW: number, pageH: number, marginX: number) {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7).setTextColor(150);
      const footerY = pageH - 12;
      doc.setDrawColor(200).line(marginX, footerY, marginX + 50, footerY);
      doc.text('Assinatura Motorista', marginX, footerY + 3);
      doc.line(pageW - marginX - 50, footerY, pageW - marginX, footerY);
      doc.text('Conferência Logística', pageW - marginX, footerY + 3, { align: 'right' });
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 5, { align: 'center' });
    }
  }
}