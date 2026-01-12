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
  private readonly CINZA_TEXTO: [number, number, number] = [80, 80, 80];
  private readonly VERMELHO: [number, number, number] = [200, 0, 0];
  private readonly MARGIN_X = 15;

  async gerarPdf(selected: OrdemCarregamento): Promise<void> {
    if (!selected) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // 1. Logotipo e Título
    const logo = await this.getLogo();
    if (logo) {
      doc.addImage(logo, 'PNG', this.MARGIN_X, currentY - 5, 30, 12);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.text('ROMANEIO DE CARREGAMENTO', pageW - this.MARGIN_X, currentY, { align: 'right' });

    // DIVISÓRIA: Linha verde superior
    currentY += 10; 
    doc.setDrawColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.setLineWidth(0.5);
    doc.line(this.MARGIN_X, currentY, pageW - this.MARGIN_X, currentY);

    // 2. Cabeçalho de Informações (Box Cinza)
    currentY += 8;
    currentY = this.drawHeaderInfo(doc, selected, currentY, pageW);

    // 3. Tabela de Itens (Incluindo coluna Frete)
    currentY += 10;
    this.drawItensTable(doc, selected, currentY);

    // 4. Rodapé (Assinatura e Numeração)
    this.drawFooter(doc, pageW);

    const dataArquivo = moment().format('DD-MM-YYYY_HHmm');
    doc.save(`Romaneio_${selected.DocEntry}_${dataArquivo}.pdf`);
  }

  private drawHeaderInfo(doc: jsPDF, selected: OrdemCarregamento, y: number, pageW: number): number {
    const boxW = pageW - (this.MARGIN_X * 2);
    // Altura do box aumentada para permitir que a descrição cresça verticalmente
    const boxH = 50; 
    
    doc.setFillColor(this.CINZA_FUNDO[0], this.CINZA_FUNDO[1], this.CINZA_FUNDO[2]);
    doc.roundedRect(this.MARGIN_X, y, boxW, boxH, 3, 3, 'F');

    const startY = y + 8;
    const col2 = pageW / 2 - 5; 
    const lineHeight = 8;
    
    const totalFrete = (selected.pedidosVenda || []).reduce((acc, p) => acc + (Number(p.DistribSum) || 0), 0);

    doc.setFontSize(10);

    // LINHA 1: Número da Ordem | Descrição (Largura de ~60mm para forçar quebra após ~34-40 caracteres)
    this.drawLabelValue(doc, 'Número da Ordem:', `${selected.DocEntry}`, this.MARGIN_X + 5, startY);
    this.drawLabelValue(doc, 'Descrição:', `${selected.U_nameOrdem || ''}`, col2, startY, 60);
    
    // LINHA 2: Data de Criação
    this.drawLabelValue(doc, 'Data de Criação:', `${selected.dataCriacao || ''}`, this.MARGIN_X + 5, startY + lineHeight);
    
    // LINHA 3: Motorista | Placa
    const yLinha3 = startY + (lineHeight * 2);
    this.drawLabelValue(doc, 'Motorista:', `${selected.U_motorista || 'Pedro'}`, this.MARGIN_X + 5, yLinha3);
    this.drawLabelValue(doc, 'Placa:', `${selected.U_placa || 'N/A'}`, col2, yLinha3);

    // LINHA 4: Total Frete (EM VERMELHO)
    const yLinha4 = startY + (lineHeight * 3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.text('Total Frete:', this.MARGIN_X + 5, yLinha4);
    
    doc.setTextColor(this.VERMELHO[0], this.VERMELHO[1], this.VERMELHO[2]);
    doc.text(`R$ ${this.formatCurrency(totalFrete)}`, this.MARGIN_X + 28, yLinha4);

    return y + boxH;
  }

  private drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number, wrapWidth?: number) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.text(label, x, y);

    const labelWidth = doc.getTextWidth(label) + 2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.CINZA_TEXTO[0], this.CINZA_TEXTO[1], this.CINZA_TEXTO[2]);

    if (wrapWidth) {
      // splitTextToSize faz o texto "ir para a próxima linha" se for maior que wrapWidth
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
    const totalFreteAcumulado = itensAgrupados.reduce((acc, item) => acc + item.frete, 0);

    autoTable(doc, {
      startY: y + 10,
      head: [['Item', 'Descrição', 'Quantidade', 'Peso Total (kg)', 'Frete']],
      body: [
        ...itensAgrupados.map(i => [
          i.itemCode,
          i.descricao,
          i.quantidade,
          i.pesoTotal.toFixed(2),
          `R$ ${this.formatCurrency(i.frete)}`
        ]),
        [
          { content: 'TOTAIS GERAIS:', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold' } },
          { content: totalQtd.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
          { content: totalPeso.toFixed(2) + ' kg', styles: { fontStyle: 'bold', halign: 'center' } },
          { content: `R$ ${this.formatCurrency(totalFreteAcumulado)}`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]
      ],
      theme: 'plain',
      headStyles: { fillColor: this.VERDE_SUSTEN, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3, textColor: 50 },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' }
      }
    });
  }

  private drawFooter(doc: jsPDF, pageW: number): void {
    const pageH = doc.internal.pageSize.getHeight();
    const footerY = pageH - 25;

    // Linha e Campo de Assinatura
    doc.setDrawColor(180);
    doc.line(this.MARGIN_X, footerY, this.MARGIN_X + 80, footerY);
    doc.setFontSize(9);
    doc.setTextColor(this.CINZA_TEXTO[0], this.CINZA_TEXTO[1], this.CINZA_TEXTO[2]);
    doc.text('Assinatura: ___________________________', this.MARGIN_X, footerY + 5);

    // Numeração de Páginas
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${totalPages}`, pageW - this.MARGIN_X - 25, footerY + 5);
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
          pesoTotal: 0,
          frete: 0
        });
      }
      const item = map.get(key);
      item.quantidade += Number(p.Quantity || 0);
      item.pesoTotal += (Number(p.Quantity || 0) * Number(p.Weight1 || 0));
      item.frete += Number(p.DistribSum || 0); // Mapeamento da coluna Frete
    });
    return Array.from(map.values());
  }

  private formatCurrency(value: any): string {
    return (Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private async getLogo(): Promise<string | null> {
    return 'logo.png'; 
  }
}