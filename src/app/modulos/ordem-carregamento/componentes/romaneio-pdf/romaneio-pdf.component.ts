import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as moment from 'moment';
import { OrdemCarregamento } from '../../models/ordem-carregamento';

@Injectable({
  providedIn: 'root'
})
export class RomaneioPdfService {

  private readonly VERDE_SUSTEN: [number, number, number] = [37, 162, 70];
  private readonly CINZA_FUNDO: [number, number, number] = [245, 247, 246];
  private readonly MARGIN_X = 15;

  async gerarPdf(selected: OrdemCarregamento): Promise<void> {
    if (!selected) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let currentY = 15;

    const logo = await this.getLogo();
    if (logo) {
      doc.addImage(logo, 'PNG', this.MARGIN_X, currentY - 5, 30, 12);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.text('ROMANEIO DE CARREGAMENTO', pageW - this.MARGIN_X, currentY, { align: 'right' });

    currentY += 10; 
    doc.setDrawColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.setLineWidth(0.5);
    doc.line(this.MARGIN_X, currentY, pageW - this.MARGIN_X, currentY);

    currentY += 8;
    currentY = this.drawHeaderInfo(doc, selected, currentY, pageW);

    currentY += 10;
    this.drawItensTable(doc, selected, currentY);

    this.desenharRodape(doc, pageW, pageH, this.MARGIN_X);

    const dataArquivo = moment().format('DD-MM-YYYY_HHmm');
    doc.save(`Romaneio_${selected.DocEntry}_${dataArquivo}.pdf`);
  }

  private drawHeaderInfo(doc: jsPDF, selected: OrdemCarregamento, y: number, pageW: number): number {
    const boxW = pageW - (this.MARGIN_X * 2);
    const boxH = 40; 
    
    doc.setFillColor(this.CINZA_FUNDO[0], this.CINZA_FUNDO[1], this.CINZA_FUNDO[2]);
    doc.roundedRect(this.MARGIN_X, y, boxW, boxH, 3, 3, 'F');

    const startY = y + 8;
    const col2 = pageW / 2 - 5; 
    const lineHeight = 8;
    
    doc.setFontSize(10);
    this.drawLabelValue(doc, 'Número da Ordem:', `${selected.DocEntry}`, this.MARGIN_X + 5, startY);
    this.drawLabelValue(doc, 'Descrição:', `${selected.U_nameOrdem || ''}`, col2, startY, 60);
    this.drawLabelValue(doc, 'Data de Criação:', `${selected.dataCriacao || ''}`, this.MARGIN_X + 5, startY + lineHeight);
    
    const yLinha3 = startY + (lineHeight * 2);
    this.drawLabelValue(doc, 'Motorista:', `${selected.U_motorista || 'Não informado'}`, this.MARGIN_X + 5, yLinha3);
    this.drawLabelValue(doc, 'Placa:', `${selected.U_placa || 'N/A'}`, col2, yLinha3);

    return y + boxH;
  }

  private drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number, wrapWidth?: number) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.text(label, x, y);

    const labelWidth = doc.getTextWidth(label) + 2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); 

    if (wrapWidth) {
      const splitValue = doc.splitTextToSize(value, wrapWidth);
      doc.text(splitValue, x + labelWidth, y);
    } else {
      doc.text(value, x + labelWidth, y);
    }
  }

  private drawItensTable(doc: jsPDF, selected: OrdemCarregamento, y: number): void {
    doc.setFillColor(240, 248, 242);
    doc.rect(this.MARGIN_X, y, doc.internal.pageSize.getWidth() - (this.MARGIN_X * 2), 8, 'F');
    doc.setFillColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.rect(this.MARGIN_X, y, 1.5, 8, 'F'); 

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Itens do Romaneio', this.MARGIN_X + 5, y + 5.5);

    const itensAgrupados = this.agruparItens(selected.pedidosVenda || []);
    const totalQtd = itensAgrupados.reduce((acc, item) => acc + item.quantidade, 0);
    const totalPeso = itensAgrupados.reduce((acc, item) => acc + item.pesoTotal, 0);

    autoTable(doc, {
      startY: y + 10,
      head: [['Item', 'Descrição', 'Quantidade', 'Peso Total (kg)', 'Lote']],
      body: [
        ...itensAgrupados.map(i => [
          i.itemCode,
          i.descricao,
          i.quantidade,
          this.formatDecimal(i.pesoTotal),
          '' 
        ]),
        [
          { content: 'TOTAIS GERAIS:', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold', textColor: 0 } },
          { content: totalQtd.toString(), styles: { fontStyle: 'bold', halign: 'center', textColor: 0 } },
          { content: this.formatDecimal(totalPeso) + ' kg', styles: { fontStyle: 'bold', halign: 'center', textColor: 0 } },
          { content: '', styles: { halign: 'right' } }
        ]
      ],
      theme: 'plain',
      headStyles: { fillColor: this.VERDE_SUSTEN, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3, textColor: 0, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 35 },
        4: { halign: 'center', cellWidth: 30 }
      }
    });
  }

  private desenharRodape(doc: jsPDF, pageW: number, pageH: number, marginX: number) {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = pageH - 20;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.setDrawColor(100);
      
      doc.line(marginX, footerY, marginX + 60, footerY);
      doc.text('Assinatura Motorista', marginX, footerY + 4);
      
      doc.line(pageW - marginX - 60, footerY, pageW - marginX, footerY);
      doc.text('Conferência Logística', pageW - marginX, footerY + 4, { align: 'right' });
      
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
    }
  }

  private agruparItens(pedidos: any[]): any[] {
    const map = new Map();
    pedidos.forEach(p => {
      const key = p.ItemCode;
      if (!map.has(key)) {
        map.set(key, {
          itemCode: p.ItemCode,
          descricao: p.Dscription,
          quantidade: 0,
          pesoTotal: 0
        });
      }
      const item = map.get(key);
      item.quantidade += Number(p.Quantity || 0);
      
      item.pesoTotal += Number(p.Weight1 || 0);
    });
    return Array.from(map.values());
  }

  private formatDecimal(value: any): string {
    return (Number(value) || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  private getLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = 'logo.png'; 
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error('Erro ao carregar a logo');
        resolve(null);
      };
    });
  }
}