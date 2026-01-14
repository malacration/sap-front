import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrdemCarregamento } from '../models/ordem-carregamento';

@Injectable({
  providedIn: 'root'
})
export class OrdemCarregamentoPdfService {

  private readonly VERDE_SUSTEN: [number, number, number] = [37, 162, 70];
  private readonly AZUL_DESTAQUE: [number, number, number] = [0, 51, 153];
  private readonly CINZA_BORDA: [number, number, number] = [157, 157, 157];
  private readonly MARGIN_X = 10;

  async gerarPdf(selected: OrdemCarregamento, transportadoraNome: string = ''): Promise<void> {
    if (!selected) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let currentY = 15;

    const totalItens = (selected.pedidosVenda || []).reduce((acc, p) => acc + Number(p.Quantity || 0), 0);
    const totalPesoGeral = (selected.pedidosVenda || []).reduce((acc, p) => 
      acc + (Number(p.Quantity || 0) * Number(p.Weight1 || 0)), 0
    );

    const logo = await this.getLogo();
    if (logo) {
      doc.addImage(logo, 'PNG', this.MARGIN_X, currentY - 5, 30, 12, undefined, 'FAST');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.text('ORDEM DE CARREGAMENTO', pageW - this.MARGIN_X, currentY, { align: 'right' });

    currentY += 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(this.MARGIN_X, currentY, pageW - this.MARGIN_X, currentY);
    
    currentY += 8;
    currentY = this.drawInfoList(doc, selected, totalItens, totalPesoGeral, currentY);

    currentY += 5;
    currentY = this.drawLogisticsBox(doc, selected, transportadoraNome, currentY, pageW);

    this.drawTable(doc, selected, currentY);

    const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    doc.save(`Ordem_Carregamento_${selected.DocEntry}_${dataArquivo}.pdf`);
  }

  private drawInfoList(doc: jsPDF, selected: OrdemCarregamento, totalItens: number, totalPeso: number, y: number): number {
    doc.setFontSize(9);

    const info = [
      { label: 'Número da Ordem:', value: selected.DocEntry, space: 35 },
      { label: 'Data de Criação:', value: selected.dataCriacao, space: 35 },
      { label: 'Descrição:', value: selected.U_nameOrdem, space: 22 },
      { label: 'Status:', value: selected.U_Status?.toUpperCase(), space: 15 },
      { label: 'Quantidade Total:', value: `${totalItens}`, space: 30, color: this.VERDE_SUSTEN },
      { label: 'Peso Total Ordem:', value: `${this.formatDecimal(totalPeso)} kg`, space: 30, color: this.VERDE_SUSTEN }
    ];

    info.forEach(item => {
      doc.setFont('helvetica', 'bold');
      
      if (item.color) {
        doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      } else {
        doc.setTextColor(0, 0, 0);
      }

      doc.text(item.label, this.MARGIN_X, y);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.value}`, this.MARGIN_X + item.space, y);
      y += 6;
    });

    doc.setTextColor(0, 0, 0);
    return y;
  }

  private drawLogisticsBox(doc: jsPDF, selected: OrdemCarregamento, transportadora: string, y: number, pageW: number): number {
    const boxHeight = 18;
    const col2 = pageW / 2 + 5;

    doc.setFillColor(245, 245, 245);
    doc.rect(this.MARGIN_X, y, pageW - (this.MARGIN_X * 2), boxHeight, 'F');
    doc.setDrawColor(this.CINZA_BORDA[0], this.CINZA_BORDA[1], this.CINZA_BORDA[2]);
    doc.rect(this.MARGIN_X, y, pageW - (this.MARGIN_X * 2), boxHeight, 'S');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    let lineY = y + 6;
    doc.text('PLACA:', this.MARGIN_X + 3, lineY);
    doc.text('MOTORISTA:', col2, lineY);

    doc.setFont('helvetica', 'normal');
    doc.text(`${selected.U_placa || 'N/A'}`, this.MARGIN_X + 18, lineY);
    doc.text(`${selected.U_motorista || 'N/A'}`, col2 + 22, lineY);

    lineY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSPORTADORA:', this.MARGIN_X + 3, lineY);
    doc.text('PESO CAMINHÃO:', col2, lineY);

    doc.setFont('helvetica', 'normal');
    doc.text(`${transportadora || 'N/A'}`, this.MARGIN_X + 35, lineY);
    doc.text(`${selected.U_capacidadeCaminhao || '0.00'} kg`, col2 + 32, lineY);

    return y + boxHeight + 8;
  }

  private drawTable(doc: jsPDF, selected: OrdemCarregamento, y: number): void {
    autoTable(doc, {
      startY: y,
      head: [['PEDIDO', 'CÓD. CLI', 'CLIENTE', 'LOCALIDADE', 'VENDEDOR', 'CÓD. ITEM', 'PRODUTO', 'QTD', 'PESO TOTAL (KG)', 'UN']],
      body: (selected.pedidosVenda || []).map(p => {
        const pesoTotalRow = (Number(p.Quantity || 0) * Number(p.Weight1 || 0));
        return [
          { content: p.DocNum, styles: { fontStyle: 'bold' } },
          p.CardCode,
          p.CardName,
          p.Name,
          p.SlpName || 'N/A',
          p.ItemCode,
          p.Dscription,
          { content: p.Quantity, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: this.formatDecimal(pesoTotalRow), styles: { halign: 'center' } },
          { content: p.UomCode, styles: { halign: 'center' } }
        ];
      }),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 6.5,
        textColor: [0, 0, 0],
        lineColor: this.CINZA_BORDA,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: this.VERDE_SUSTEN,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 6
      },
      columnStyles: {
        0: { cellWidth: 12 }, 
        1: { cellWidth: 14 }, 
        2: { cellWidth: 'auto' }, 
        3: { cellWidth: 18 }, 
        4: { cellWidth: 18 }, 
        5: { cellWidth: 18 }, 
        7: { cellWidth: 10 }, 
        8: { cellWidth: 15 },
        9: { cellWidth: 10 }  
      },
      margin: { left: this.MARGIN_X, right: this.MARGIN_X }
    });
  }

  private formatDecimal(value: any): string {
    return (Number(value) || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  private async getLogo(): Promise<Uint8Array | null> {
    try {
      const response = await fetch('logo.png');
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }
}