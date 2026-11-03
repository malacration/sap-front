import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable, { CellDef } from 'jspdf-autotable';
import * as moment from 'moment';
import { OrdemCarregamento } from '../../models/ordem-carregamento';
import { isFaturaReserva } from '../../models/fatura-reserva';

/**
 * "Ordem de carregamento e controle de expedicao de produtos / BPF": o modelo da logistica (Jaqueline) para
 * conferir o veiculo e anotar os lotes na carga. A ordem preenche o que ja sabe (numero, data, destino, placa,
 * motorista, clientes, produtos, quantidade e peso); o resto fica em branco para preencher a mao.
 */
@Injectable({ providedIn: 'root' })
export class ControleExpedicaoPdfService {

  private readonly VERDE: [number, number, number] = [169, 208, 142];
  private readonly VERDE_ESCURO: [number, number, number] = [37, 162, 70];
  private readonly M = 8;
  private readonly LINHAS_EM_BRANCO = 8;

  async gerarPdf(ordem: OrdemCarregamento): Promise<void> {
    if (!ordem) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const larg = pageW - this.M * 2;               // 281 mm
    const wCliente = 86, wProduto = 46;             // mesmas colunas do modelo
    const xDireita = this.M + wCliente + wProduto;  // onde comeca o bloco do veiculo
    doc.setLineWidth(0.2);
    doc.setDrawColor(0);

    const linhas = (ordem.pedidosVenda || []) as any[];
    const logo = await this.getLogo();

    // ---------- cabecalho (30 mm)
    const y0 = this.M, hCab = 30;
    doc.rect(this.M, y0, wCliente, hCab);
    if (logo) doc.addImage(logo, 'PNG', this.M + 2, y0 + 2, 60, 22);

    const xCentro = this.M + wCliente, wCentro = 138, xNum = xCentro + wCentro, wNum = larg - wCliente - wCentro;
    doc.rect(xCentro, y0, wCentro, 6);
    this.texto(doc, 'ORDEM DE CARREGAMENTO E CONTROLE DE EXPEDIÇÃO DE PRODUTOS / BPF', xCentro + wCentro / 2, y0 + 4.2, 8, 'bold', 'center');
    doc.rect(xCentro, y0 + 6, wCentro, 5);
    this.texto(doc, 'O QUE: Avaliar condições Higiênico-sanitárias dos caminhões e do produto', xCentro + wCentro / 2, y0 + 9.5, 6.5, 'bold', 'center');
    doc.rect(xCentro, y0 + 11, wCentro, 12);
    this.destino(doc, this.destinos(linhas, ordem), xCentro + wCentro / 2, y0 + 17.5, wCentro - 4);
    const wPlaca = 56;
    doc.setFillColor(...this.VERDE);
    doc.rect(xCentro, y0 + 23, wPlaca, 7, 'FD');
    this.texto(doc, 'PLACA:', xCentro + 3, y0 + 28, 11, 'bold');
    this.textoAjustado(doc, ordem.U_placa || '', xCentro + 24, y0 + 28, wPlaca - 24 - 2, 11, 7);
    //O jsPDF usa a cor do texto no preenchimento seguinte: sem repor, o retangulo sai preto.
    doc.setFillColor(...this.VERDE);
    doc.rect(xCentro + wPlaca, y0 + 23, wCentro - wPlaca, 7, 'FD');
    this.texto(doc, 'MOTORISTA:', xCentro + wPlaca + 2, y0 + 28, 11, 'bold');
    this.textoAjustado(doc, ordem.U_motorista || '', xCentro + wPlaca + 33, y0 + 28, wCentro - wPlaca - 33 - 2, 10, 6);

    const campos: Array<[string, string]> = [['Nº', `${ordem.DocEntry ?? ''}`], ['DATA:', ordem.dataCriacao || moment().format('DD/MM/YYYY')],
      ['Horário', ''], ['Inicial:', ''], ['Final:', '']];
    campos.forEach(([rotulo, valor], i) => {
      doc.rect(xNum, y0 + i * 6, wNum, 6);
      this.texto(doc, rotulo, xNum + (rotulo === 'Horário' ? wNum / 2 : 2), y0 + i * 6 + 4.2, 8, 'bold', rotulo === 'Horário' ? 'center' : 'left');
      if (valor) this.texto(doc, valor, xNum + 16, y0 + i * 6 + 4.2, 8, 'normal');
    });

    // ---------- faixa de informacoes (26 mm): TKT, acompanhamento e veiculo
    const y1 = y0 + hCab, hFaixa = 26;
    doc.setFillColor(...this.VERDE);
    doc.rect(this.M, y1, wCliente, 6.5, 'FD');
    this.texto(doc, 'Informações', this.M + wCliente / 2, y1 + 4.6, 9, 'bold', 'center');
    ['Nº TKT:', 'Peso TKT:', 'Peso NF:'].forEach((r, i) => {
      doc.rect(this.M, y1 + 6.5 + i * 6.5, wCliente, 6.5);
      this.texto(doc, r, this.M + 1.5, y1 + 6.5 + i * 6.5 + 4.6, 8, 'bold');
    });
    doc.setFillColor(...this.VERDE);
    doc.rect(this.M + wCliente, y1, wProduto, 6.5, 'FD');
    this.texto(doc, 'Acompanhamento de carga', this.M + wCliente + wProduto / 2, y1 + 4.6, 8, 'bold', 'center');
    doc.rect(this.M + wCliente, y1 + 6.5, wProduto, 19.5);
    this.caixaMarcar(doc, this.M + wCliente + 9, y1 + 16.5, 'SIM');
    this.caixaMarcar(doc, this.M + wCliente + 27, y1 + 16.5, 'NÃO');

    this.blocoVeiculo(doc, xDireita, y1, larg - wCliente - wProduto);

    // ---------- itens
    // Tres linhas de cabecalho, como no modelo: grupos, depois Q/dd-Lote e as condicoes, depois C / NC.
    const r3 = (c: string): CellDef => ({ content: c, rowSpan: 3 });
    const cab: CellDef[][] = [
      [r3('CLIENTE / DOCUMENTO'), r3('PRODUTO'), r3('QTD'), r3('PESO'), r3('VOLUME'),
       { content: 'Qtd Realizada', colSpan: 4 }, { content: 'Condições do produto', colSpan: 6 }],
      [{ content: 'Q/dd', rowSpan: 2 }, { content: 'Lote', rowSpan: 2 }, { content: 'Q/dd', rowSpan: 2 }, { content: 'Lote', rowSpan: 2 },
       { content: 'Protegido c/ lona', colSpan: 2 }, { content: 'Rotulagem', colSpan: 2 }, { content: 'Aparência', colSpan: 2 }],
      ['C', 'NC', 'C', 'NC', 'C', 'NC'].map(c => ({ content: c }) as CellDef)
    ];
    const corpo: string[][] = linhas.map(l => {
      const qtd = Number(l.Quantity || 0), peso = Number(l.Weight1 || 0);
      return [this.cliente(l), `${l.Dscription ?? ''}`, this.num(qtd), qtd ? this.num(peso / qtd) : '', this.num(peso), '', '', '', '', '', '', '', '', '', ''];
    });
    for (let i = 0; i < this.LINHAS_EM_BRANCO; i++) corpo.push(Array(15).fill(''));

    const totalQtd = linhas.reduce((a, l) => a + Number(l.Quantity || 0), 0);
    const totalPeso = linhas.reduce((a, l) => a + Number(l.Weight1 || 0), 0);
    const emSacos = linhas.length > 0 && linhas.every(l => `${l.UomCode ?? ''}`.toUpperCase().startsWith('SC'));
    const rodape: CellDef[] = [
      { content: '', styles: { fillColor: this.VERDE } }, { content: '', styles: { fillColor: this.VERDE } },
      { content: `${this.num(totalQtd)}${emSacos ? ' SC' : ''}`, colSpan: 1, styles: { fontStyle: 'bold', halign: 'center', fillColor: this.VERDE } },
      { content: '', styles: { fillColor: this.VERDE } },
      { content: `${this.num(totalPeso)} KG`, styles: { fontStyle: 'bold', halign: 'center', fillColor: this.VERDE } },
      ...Array(10).fill({ content: '', styles: { fillColor: this.VERDE } })
    ];

    autoTable(doc, {
      startY: y1 + hFaixa,
      margin: { left: this.M, right: this.M, bottom: 12 },
      head: cab,
      body: [...corpo, rodape],
      theme: 'grid',
      tableWidth: larg,
      styles: { fontSize: 8, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: 0, valign: 'middle', minCellHeight: 6.5 },
      headStyles: { fillColor: this.VERDE, textColor: 0, fontStyle: 'bold', halign: 'center', fontSize: 7.5 },
      bodyStyles: { halign: 'center' },
      columnStyles: {
        0: { cellWidth: wCliente, halign: 'left', fontStyle: 'bold' }, 1: { cellWidth: wProduto, fontStyle: 'bold' },
        2: { cellWidth: 14 }, 3: { cellWidth: 12 }, 4: { cellWidth: 16 },
        5: { cellWidth: 14 }, 6: { cellWidth: 14 }, 7: { cellWidth: 14 }, 8: { cellWidth: 14 },
        9: { cellWidth: 8.5 }, 10: { cellWidth: 8.5 }, 11: { cellWidth: 8.5 }, 12: { cellWidth: 8.5 }, 13: { cellWidth: 8.5 }, 14: { cellWidth: 8.5 }
      }
    });

    this.paginar(doc);
    doc.save(`Controle_Expedicao_${ordem.DocEntry}_${moment().format('DD-MM-YYYY_HHmm')}.pdf`);
  }

  // Grade "INFORMACOES DO VEICULO": LOCAL x (Limpo, Ausencia de pragas, Sem odores, Integro, Tipo de limpeza), C / NC.
  private blocoVeiculo(doc: jsPDF, x: number, y: number, w: number): void {
    doc.setFillColor(...this.VERDE);
    doc.rect(x, y, w, 5.5, 'FD');
    this.texto(doc, 'INFORMAÇÕES DO VEÍCULO', x + w / 2, y + 4, 8.5, 'bold', 'center');
    const g = (c: string, span = 2): CellDef => ({ content: c, colSpan: span, styles: { halign: 'center' } });
    autoTable(doc, {
      startY: y + 5.5,
      margin: { left: x, right: this.M },
      tableWidth: w,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 0.6, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: 0, halign: 'center', valign: 'middle', minCellHeight: 5 },
      head: [
        [{ content: 'LOCAL', rowSpan: 2, styles: { halign: 'left' } }, g('Limpo'), g('Ausência de pragas'), g('Sem odores indesejáveis'), g('Íntegro'), g('Tipo de limpeza', 3)],
        ['C', 'NC', 'C', 'NC', 'C', 'NC', 'C', 'NC', 'Varredura', 'Lavagem', 'NA']
      ],
      body: [['PISO', ...Array(11).fill('')], ['LATERAL', ...Array(11).fill('')]],
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 26, halign: 'left', fontStyle: 'bold' } }
    });
  }

  private caixaMarcar(doc: jsPDF, x: number, y: number, rotulo: string): void {
    doc.setDrawColor(90);
    doc.rect(x, y - 3.2, 4, 4);
    doc.setDrawColor(0);
    this.texto(doc, rotulo, x + 6, y, 9, 'normal');
  }

  private cliente(l: any): string {
    const tipo = isFaturaReserva(l) ? 'NF' : 'PV';
    const loc = l.Name ? ` (${l.Name})` : '';
    return `${l.CardName ?? ''} - ${tipo} ${l.DocNum ?? ''}${loc}`;
  }

  // Localidades da carga, na ordem em que aparecem; sem localidade usa o nome da ordem.
  private destinos(linhas: any[], ordem: OrdemCarregamento): string {
    const lista = [...new Set(linhas.map(l => `${l.Name ?? ''}`.trim().toUpperCase()).filter(n => !!n))];
    return lista.length ? lista.join(' / ') : (ordem.U_nameOrdem || '');
  }

  // Uma linha grande quando cabe (o modelo traz um destino so); carga com varias localidades quebra em ate
  // 2 linhas pequenas, com reticencias, para nao invadir o logo nem o quadro de horario.
  private destino(doc: jsPDF, texto: string, x: number, y: number, largMax: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    for (let tamanho = 18; tamanho >= 10; tamanho--) {
      doc.setFontSize(tamanho);
      if (doc.getTextWidth(texto) <= largMax) { doc.text(texto, x, y, { align: 'center' }); return; }
    }
    doc.setFontSize(8);
    let linhas: string[] = doc.splitTextToSize(texto, largMax);
    if (linhas.length > 2) {
      let ultima = linhas[1];
      while (ultima.length > 1 && doc.getTextWidth(ultima + '…') > largMax) ultima = ultima.slice(0, -1);
      linhas = [linhas[0], ultima.trimEnd() + '…'];
    }
    doc.text(linhas, x, linhas.length === 1 ? y : y - 2, { align: 'center', lineHeightFactor: 1.15 });
  }

  // Texto livre (placa, motorista) numa celula de largura fixa: encolhe a letra ate caber e, se nem assim couber,
  // corta com reticencias. Sem isso um nome comprido invade o quadro vizinho.
  private textoAjustado(doc: jsPDF, texto: string, x: number, y: number, largMax: number, tamanhoMax: number, tamanhoMin: number): void {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    let tamanho = tamanhoMax;
    doc.setFontSize(tamanho);
    while (doc.getTextWidth(texto) > largMax && tamanho > tamanhoMin) { tamanho -= 0.5; doc.setFontSize(tamanho); }
    let final = texto;
    while (final.length > 1 && doc.getTextWidth(final) > largMax) final = final.slice(0, -1);
    doc.text(final.length < texto.length ? final.trimEnd() + '…' : final, x, y);
  }

  private paginar(doc: jsPDF): void {
    const total = (doc as any).internal.getNumberOfPages();
    const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      this.texto(doc, `Página ${i} de ${total}`, w / 2, h - 5, 7, 'normal', 'center');
    }
  }

  private texto(doc: jsPDF, t: string, x: number, y: number, tamanho: number, estilo: 'bold' | 'normal', alinhar: 'left' | 'center' | 'right' = 'left'): void {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(0);
    doc.text(t, x, y, { align: alinhar });
  }

  private num(v: number): string {
    return (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  private getLogo(): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
      const img = new Image();
      img.src = 'logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  }
}
