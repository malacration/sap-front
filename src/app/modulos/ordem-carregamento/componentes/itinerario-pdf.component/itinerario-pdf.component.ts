import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import * as moment from 'moment';
import { OrdemCarregamento } from '../../models/ordem-carregamento';

@Injectable({ providedIn: 'root' })
export class ItinerarioPdfService {

  // Cores Identidade SustenNutri
  private readonly VERDE_SUSTEN: [number, number, number] = [0, 155, 58]; 
  private readonly VERDE_CLARO_BG: [number, number, number] = [235, 247, 238];
  private readonly CINZA_LINHA: [number, number, number] = [200, 200, 200];
  private readonly PRETO_TEXTO: [number, number, number] = [40, 40, 40];

  // --- COLOQUE O BASE64 DA SUA LOGO AQUI ---
  private readonly LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'; 

  gerarPdf(ordem: OrdemCarregamento, pedidos: any[], localidadesMap: Map<string, string>) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 12;
    let cursorY = 10;

    const desenharCabecalho = () => {
      cursorY = 10;
      // Logo
      try {
        doc.addImage(this.LOGO_BASE64, 'PNG', marginX, cursorY, 38, 12);
      } catch (e) {
        doc.setFontSize(8); doc.text('LOGO SUSTENNUTRI', marginX, cursorY + 5);
      }

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.text('ITINERÁRIO DE CARREGAMENTO', pageW - marginX, cursorY + 10, { align: 'right' });

      cursorY += 16;
      doc.setDrawColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.setLineWidth(0.7);
      doc.line(marginX, cursorY, pageW - marginX, cursorY);
      cursorY += 6;
    };

    desenharCabecalho();

    // --- Bloco Superior de Detalhes da Ordem ---
    const infoHeight = 28;
    doc.setFillColor(this.VERDE_CLARO_BG[0], this.VERDE_CLARO_BG[1], this.VERDE_CLARO_BG[2]);
    doc.roundedRect(marginX, cursorY, pageW - (marginX * 2), infoHeight, 2, 2, 'F');

    doc.setFontSize(9);
    const col2X = pageW / 2 - 10;
    
    // Usando as propriedades do seu Model OrdemCarregamento
    this.escreverCampoVerde(doc, 'Número da Ordem:', ordem.DocEntry.toString(), marginX + 5, cursorY + 8);
    this.escreverCampoVerde(doc, 'Data de Criação:', ordem.dataCriacao, marginX + 5, cursorY + 18);

    const desc = doc.splitTextToSize(ordem.U_nameOrdem || 'NÃO INFORMADO', (pageW / 2) - 15);
    this.escreverCampoVerde(doc, 'Descrição:', desc, col2X, cursorY + 8);
    this.escreverCampoVerde(doc, 'Status:', ordem.U_Status === 'O' ? 'Aberto' : 'Fechado', col2X, cursorY + 18 + (desc.length > 1 ? 4 : 0));

    cursorY += infoHeight + 8;

    // --- Listagem de Sequências (Pedidos) ---
    pedidos.forEach((p, index) => {
      // Verifica espaço (cada bloco tem +- 55mm)
      if (cursorY + 55 > pageH - 35) {
        doc.addPage();
        desenharCabecalho();
      }

      const seqStartY = cursorY;
      
      // Cabeçalho da Sequência
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.text(`Sequência: ${index + 1}`, marginX + 2, cursorY + 5);
      doc.text(`Pedido SAP: ${p.DocNum || p.DocEntry}`, pageW - marginX - 2, cursorY + 5, { align: 'right' });
      
      cursorY += 12;

      // Conteúdo
      doc.setFontSize(9);
      doc.setTextColor(this.PRETO_TEXTO[0], this.PRETO_TEXTO[1], this.PRETO_TEXTO[2]);
      
      this.escreverDetalhe(doc, 'Cliente:', `${p.CardName} (${p.CardCode})`, marginX + 5, cursorY);
      cursorY += 5;
      this.escreverDetalhe(doc, 'Localidade:', localidadesMap.get(p.CardCode) || 'Candeias do Jamari', marginX + 5, cursorY);
      cursorY += 5;
      
      const endereco = doc.splitTextToSize(p.Address2 || 'ENDEREÇO NÃO CADASTRADO', pageW - (marginX * 2) - 45);
      this.escreverDetalhe(doc, 'Endereço de Entrega:', endereco, marginX + 5, cursorY);
      cursorY += (endereco.length * 4.5);

      // Linha Pontilhada
      doc.setDrawColor(this.CINZA_LINHA[0], this.CINZA_LINHA[1], this.CINZA_LINHA[2]);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(marginX + 5, cursorY, pageW - marginX - 5, cursorY);
      doc.setLineDashPattern([], 0);
      cursorY += 6;

      this.escreverDetalhe(doc, 'Item:', `${p.ItemCode} - ${p.Dscription}`, marginX + 5, cursorY);
      cursorY += 5;
      this.escreverDetalhe(doc, 'Quantidade:', `${p.Quantity} ${p.UomCode || 'SC'}`, marginX + 5, cursorY);
      
      cursorY += 8;

      // Borda do Bloco
      doc.setDrawColor(this.CINZA_LINHA[0], this.CINZA_LINHA[1], this.CINZA_LINHA[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, seqStartY, pageW - (marginX * 2), cursorY - seqStartY, 2, 2, 'S');
      
      cursorY += 6; // Espaço entre blocos
    });

    this.desenharRodape(doc, pageW, pageH, marginX);

    doc.save(`Itinerario_Ordem_${ordem.DocEntry}.pdf`);
  }

  private escreverCampoVerde(doc: jsPDF, label: string, valor: any, x: number, y: number) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(valor, x + labelW + 2, y);
  }

  private escreverDetalhe(doc: jsPDF, label: string, valor: any, x: number, y: number) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, x + labelW + 2, y);
  }

  private desenharRodape(doc: jsPDF, pageW: number, pageH: number, marginX: number) {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = pageH - 25;
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      
      // Linhas de Assinatura
      doc.line(marginX, footerY, marginX + 60, footerY);
      doc.text('Assinatura Motorista', marginX, footerY + 4);

      doc.line(pageW - marginX - 60, footerY, pageW - marginX, footerY);
      doc.text('Conferência Logística', pageW - marginX, footerY + 4, { align: 'right' });

      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 10, { align: 'center' });
    }
  }
}