import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { OrdemCarregamento } from '../../models/ordem-carregamento';

@Injectable({ providedIn: 'root' })
export class ItinerarioPdfService {
  private readonly VERDE_SUSTEN: [number, number, number] = [0, 155, 58];
  private readonly VERDE_CLARO_BG: [number, number, number] = [235, 247, 238];
  private readonly CINZA_LINHA: [number, number, number] = [200, 200, 200];
  private readonly PRETO_TEXTO: [number, number, number] = [40, 40, 40];

  constructor() {}

  private quebrarTextoPorCaracteres(texto: string, limite: number): string[] {
    if (!texto) return ['NÃO INFORMADO'];
    const regex = new RegExp(`.{1,${limite}}`, 'g');
    return texto.match(regex) || [texto];
  }

  private carregarLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      // No Angular, o caminho correto para imagens estáticas é dentro de assets
      img.src = 'logo.png'; 
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error("Não foi possível carregar a logo em assets/logo.png");
        resolve(null);
      };
    });
  }

  async gerarPdf(ordem: OrdemCarregamento, pedidosAgrupados: any[], localidadesMap: Map<string, string>) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 12;
    let cursorY = 10;

    const logoImg = await this.carregarLogo();

    const desenharCabecalho = () => {
      cursorY = 10;
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', marginX, cursorY - 3, 30, 12);
      }
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.text('ITINERÁRIO DE ENTREGA', pageW - marginX, cursorY + 7, { align: 'right' });

      cursorY += 14;
      doc.setDrawColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.setLineWidth(0.7);
      doc.line(marginX, cursorY, pageW - marginX, cursorY);
      cursorY += 6;
    };

    desenharCabecalho();

    // --- Bloco Superior (Dados da Ordem) ---
    // Resetando o tamanho da fonte para os dados (estava herdando 18 do título)
    doc.setFontSize(10); 
    const alturaBlocoVerde = 28;

    doc.setFillColor(this.VERDE_CLARO_BG[0], this.VERDE_CLARO_BG[1], this.VERDE_CLARO_BG[2]);
    doc.roundedRect(marginX, cursorY, pageW - (marginX * 2), alturaBlocoVerde, 2, 2, 'F');
    
    // Coluna 1
    this.escreverCampoVerde(doc, 'Número da Ordem:', ordem.DocEntry.toString(), marginX + 5, cursorY + 8);
    this.escreverCampoVerde(doc, 'Data de Criação:', ordem.dataCriacao || '', marginX + 5, cursorY + 18);
    
    // Coluna 2
    const coluna2X = (pageW / 2) - 5;
    const desc = this.quebrarTextoPorCaracteres(ordem.U_nameOrdem || 'NÃO INFORMADO', 45);
    this.escreverCampoVerde(doc, 'Descrição:', desc, coluna2X, cursorY + 8);
    
    // Adicionado campo Status conforme o print
    this.escreverCampoVerde(doc, 'Status:', 'Aberto', coluna2X, cursorY + 20);
    
    cursorY += alturaBlocoVerde + 10;

    // --- Listagem de Pedidos ---
    pedidosAgrupados.forEach((pedido, index) => {
      const endereco = this.quebrarTextoPorCaracteres(pedido.Address2 || 'ENDEREÇO NÃO CADASTRADO', 72);
      const alturaPedido = 40 + (endereco.length * 5) + (pedido.itens.length * 8);

      if (cursorY + alturaPedido > pageH - 30) {
        doc.addPage();
        desenharCabecalho();
        doc.setFontSize(10); // Garante o reset do tamanho na nova página
      }

      const seqStartY = cursorY;
      
      // Cabeçalho do Pedido (Parada e Número)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
      doc.text(`Parada: ${index + 1}`, marginX + 2, cursorY + 5);
      doc.text(`Pedido: ${pedido.DocNum || pedido.DocEntry}`, pageW - marginX - 2, cursorY + 5, { align: 'right' });
      
      cursorY += 12;
      doc.setFontSize(9);
      doc.setTextColor(this.PRETO_TEXTO[0], this.PRETO_TEXTO[1], this.PRETO_TEXTO[2]);
      
      this.escreverDetalhe(doc, 'Cliente:', `${pedido.CardName} (${pedido.CardCode})`, marginX + 5, cursorY);
      cursorY += 5;
      this.escreverDetalhe(doc, 'Localidade:', localidadesMap.get(pedido.CardCode) || 'NÃO INFORMADO', marginX + 5, cursorY);
      cursorY += 5;
      this.escreverDetalhe(doc, 'Endereço:', endereco, marginX + 5, cursorY);
      cursorY += (endereco.length * 4.5) + 1;
      
      this.escreverDetalhe(doc, 'Vendedor:', `${pedido.SlpName}`, marginX + 5, cursorY);
      cursorY += 5;

      const contato = pedido.Mobil || pedido.Telephone || 'NÃO INFORMADO';
      this.escreverDetalhe(doc, 'Contato:', contato, marginX + 5, cursorY);
      cursorY += 6;

      // Divisória Interna
      doc.setDrawColor(this.CINZA_LINHA[0]);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(marginX + 5, cursorY, pageW - marginX - 5, cursorY);
      doc.setLineDashPattern([], 0);
      cursorY += 6;

      // Itens do Pedido
      pedido.itens.forEach((item: any) => {
        doc.setFont('helvetica', 'bold');
        doc.text('Produto:', marginX + 5, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${item.ItemCode} - ${item.Dscription}`, marginX + 22, cursorY);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Qtd:', pageW - 60, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${item.Quantity} ${item.UomCode || 'SC'}`, pageW - 50, cursorY);
        
        cursorY += 6;
      });

      // Borda do Bloco
      cursorY += 2;
      doc.setDrawColor(this.CINZA_LINHA[0]);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, seqStartY, pageW - (marginX * 2), cursorY - seqStartY, 2, 2, 'S');
      cursorY += 8; 
    });

    this.desenharRodape(doc, pageW, pageH, marginX);
    doc.save(`Itinerario_Ordem_${ordem.DocEntry}.pdf`);
  }

  private escreverCampoVerde(doc: jsPDF, label: string, valor: any, x: number, y: number) {
    doc.setFontSize(10); // Força o tamanho correto para evitar o bug
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.VERDE_SUSTEN[0], this.VERDE_SUSTEN[1], this.VERDE_SUSTEN[2]);
    doc.text(label, x, y);
    
    const labelW = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.PRETO_TEXTO[0], this.PRETO_TEXTO[1], this.PRETO_TEXTO[2]);
    doc.text(Array.isArray(valor) ? valor : String(valor), x + labelW + 2, y);
  }

  private escreverDetalhe(doc: jsPDF, label: string, valor: any, x: number, y: number) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.PRETO_TEXTO[0], this.PRETO_TEXTO[1], this.PRETO_TEXTO[2]);
    doc.text(label, x, y);
    
    const labelW = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.text(Array.isArray(valor) ? valor : String(valor), x + labelW + 2, y);
  }

  private desenharRodape(doc: jsPDF, pageW: number, pageH: number, marginX: number) {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = pageH - 20;
      doc.setFontSize(8);
      doc.setTextColor(100);
      
      // Linha e texto da esquerda
      doc.line(marginX, footerY, marginX + 60, footerY);
      doc.text('Assinatura Motorista', marginX, footerY + 4);
      
      // Linha e texto da direita
      doc.line(pageW - marginX - 60, footerY, pageW - marginX, footerY);
      doc.text('Conferência Logística', pageW - marginX, footerY + 4, { align: 'right' });
      
      // Numeração de página
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
    }
  }
}