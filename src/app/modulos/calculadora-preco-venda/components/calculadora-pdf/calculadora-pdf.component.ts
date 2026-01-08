import { Component, Input } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable, { RowInput, UserOptions } from 'jspdf-autotable';
import { Analise } from '../../models/analise';

@Component({
  selector: 'app-calculadora-pdf',
  template: ''
})
export class CalculadoraPdfComponent {
  @Input() analise!: Analise;

  private readonly deParaLinhas: Record<string, string> = {
    'especial': 'ESPECIAL',
    'fora': 'FORA DE LINHA',
    'mega': 'OX MEGA',
    'power': 'OX POWER',
    'premium': 'OX PREMIUM',
    'farelado': 'FARELADA',
    'terceiro': 'TERCEIROS'
  };

  private readonly deParaGrupos: Record<string, string> = {
    'sal': 'SAL MINERAL',
    'racao': 'RAÇÃO',
    'quirela': 'QUIRERA',
    'nucleo': 'NÚCLEOS E CONCENTRADOS',
    'milho': 'MILHO',
    'fora': 'FORA DE LINHA',
    'farelo': 'FARELADA',
    'ener-prot': 'ENERGÉTICO - PROTEICO',
    'adensado': 'ADENSADO'
  };

  public getCorHeader(nomeGrupo: string): string {
    const cores: Record<string, string> = {
      premium: '#F26522',
      mega: '#FFC20E',
      power: '#777777',
      suprema: '#28a745'
    };
    return cores[(nomeGrupo || '').toLowerCase().trim()] || '#004085';
  }

  async gerarPdf(): Promise<void> {
    if (!this.analise) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 10;
    
    // Configurações de altura do cabeçalho fixo
    const headerStartInfo = 10;
    const headerContentHeight = 25;
    const tableStartY = headerStartInfo + headerContentHeight + 5;

    // --- CARREGAMENTO DA LOGO ---
    let logoBytes: Uint8Array | null = null;
    try {
      logoBytes = await this.loadPngAsUint8Array('logo.png');
    } catch (e) {
      console.warn('Logo não encontrada.');
    }

    // --- PREPARAÇÃO DOS DADOS ---

    // 1. Definição das colunas (Head)
    const prazoHeaders = (this.analise.prazos || []).map(p => {
      let desc = p.descricao || '';
      if (desc.toLowerCase().includes('vista')) desc = 'À VISTA.';
      else desc = this.wrapPrazoHeader(desc);

      return {
        content: desc,
        styles: { fontStyle: 'bold' as 'bold', halign: 'center' as 'center' }
      };
    });

    // Cabeçalho completo da tabela
    const headRow = [
      { content: 'CÓDIGO', styles: { fontStyle: 'bold' as 'bold', halign: 'center' as 'center' } },
      { content: 'PRODUTO', styles: { fontStyle: 'bold' as 'bold', halign: 'left' as 'left' } },
      { content: 'EMB.', styles: { fontStyle: 'bold' as 'bold', halign: 'center' as 'center' } },
      { content: 'GRUPO', styles: { fontStyle: 'bold' as 'bold', halign: 'center' as 'center' } },
      ...prazoHeaders
    ];

    const totalCols = headRow.length;

    // 2. Agrupamento por Linha
    const getLinhaKey = (p: any) => 
      (p?.U_linha_sustennutri || 'OUTROS').toString().toLowerCase().trim();

    const linhasMap = new Map<string, any[]>();
    for (const p of (this.analise.produtos || [])) {
      const key = getLinhaKey(p);
      if (!linhasMap.has(key)) linhasMap.set(key, []);
      linhasMap.get(key)!.push(p);
    }

    const linhasOrdenadas = Array.from(linhasMap.entries()).sort((a, b) => {
      const nomeA = a[0];
      if (nomeA.includes('premium')) return -1;
      return 1;
    });

    // =================================================================
    // LOOP PRINCIPAL
    // =================================================================
    let currentY = tableStartY;

    for (let i = 0; i < linhasOrdenadas.length; i++) {
      const [linhaKey, produtosDaLinha] = linhasOrdenadas[i];

      if (i > 0) {
        doc.addPage();
        currentY = tableStartY; 
      }

      const body: RowInput[] = [];

      // --- ROW DE TÍTULO DA LINHA ---
      const labelLinha = this.deParaLinhas[linhaKey] || (linhaKey === 'outros' ? 'GERAL' : linhaKey.toUpperCase());
      const corRgb = this.hexToRgb(this.getCorHeader(linhaKey)) ?? [0, 64, 133];

      body.push([
        {
          content: labelLinha,
          colSpan: totalCols,
          styles: {
            fillColor: corRgb,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 1.5,
            fontSize: 9
          }
        } as any
      ]);

      // --- ROWS DE PRODUTOS ---
      for (const produto of produtosDaLinha) {
        let precoBase = 0;
        try {
          precoBase = produto.precoComRepasseCurrency ? produto.precoComRepasseCurrency() : 0;
        } catch { precoBase = 0; }

        const rawGrupo = (produto?.U_grupo_sustennutri || produto?.Grupo || '').toLowerCase().trim();
        const nomeGrupoColuna = this.deParaGrupos[rawGrupo] || rawGrupo.toUpperCase();

        body.push([
          // Coluna Código: BOLD
          { content: produto?.ItemCode || '', styles: { halign: 'center', fontStyle: 'bold' } },
          // Coluna Produto
          { content: produto?.Descricao || '', styles: { halign: 'left' } },
          // Coluna Emb
          { content: produto?.UnidadeMedida || '', styles: { halign: 'center' } },
          // Coluna Grupo
          { content: nomeGrupoColuna, styles: { halign: 'center', fontSize: 6 } },

          // Colunas Prazos (Preços)
          ...(this.analise.prazos || []).map(prazo => {
            const fator = prazo?.fator ?? 0;
            const precoPrazo = precoBase * (1 + fator);
            
            // >>> CORREÇÃO AQUI: \u00A0 é o espaço que não quebra linha <<<
            return {
              content: `R$\u00A0${this.formatCurrency(precoPrazo)}`,
              styles: { 
                  halign: 'right' as 'right', 
                  fontStyle: 'bold' as 'bold' 
              }
            };
          })
        ]);
      }

      // --- GERAÇÃO DA TABELA ---
      autoTable(doc, {
        head: [headRow],
        body: body,
        startY: currentY,
        theme: 'striped',

        styles: {
          font: 'helvetica',
          fontSize: 7,
          textColor: [0, 0, 0],
          lineColor: [157, 157, 157],
          lineWidth: 0.1,
          cellPadding: 1.0, 
          valign: 'middle',
          overflow: 'linebreak'
        },

        headStyles: {
          fillColor: [215, 215, 215],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [157, 157, 157]
        },

        bodyStyles: {
          textColor: [0, 0, 0]
        },

        alternateRowStyles: {
          fillColor: [238, 238, 238]
        },

        columnStyles: {
          0: { cellWidth: 24 }, // Código
          1: { cellWidth: 'auto' }, // Produto
          2: { cellWidth: 10 }, // Emb
          3: { cellWidth: 18 }, // Grupo
        },

        margin: { top: tableStartY, left: marginX, right: marginX, bottom: 10 },
        showHead: 'everyPage' 
      });
    }

    // --- RODAPÉ/CABEÇALHO FIXO ---
    const totalPages = doc.getNumberOfPages();
    const dataStr = new Date().toLocaleDateString('pt-BR');

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      if (logoBytes) {
        doc.addImage(logoBytes as any, 'PNG', marginX, headerStartInfo, 30, 12, undefined, 'FAST');
      }

      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Tabela de Preços', pageW / 2, headerStartInfo + 8, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, headerStartInfo + 14, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('VÁLIDA A PARTIR:', pageW - marginX, headerStartInfo + 5, { align: 'right' });
      
      doc.setTextColor(255, 0, 0);
      doc.text(dataStr, pageW - marginX, headerStartInfo + 10, { align: 'right' });

      doc.setDrawColor(157, 157, 157);
      doc.setLineWidth(0.5);
      doc.line(marginX, headerStartInfo + 18, pageW - marginX, headerStartInfo + 18);
    }

    const nomeLimpo = (this.analise.descricao || 'Geral').replace(/[^a-z0-9]/gi, '_');
    doc.save(`Tabela_Precos_${nomeLimpo}.pdf`);
  }

  // --- Helpers ---

  private wrapPrazoHeader(texto: string): string {
    const t = (texto || '').trim();
    if (t.includes(' ou ')) return t.replace(' ou ', '\nou ');
    if (t.includes('/')) return t.replace(/\//g, '/\n');
    if (t.length > 10 && t.endsWith(' dias')) return t.replace(' dias', '\ndias');
    return t;
  }

  private async loadPngAsUint8Array(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro ao carregar imagem: ${url}`);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  private hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}