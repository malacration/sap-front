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
    // Aplicando Bold especificamente nos headers de prazo
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

    // 2. Agrupamento por Linha (Premium, Mega, etc)
    const getLinhaKey = (p: any) => 
      (p?.U_linha_sustennutri || 'OUTROS').toString().toLowerCase().trim();

    const linhasMap = new Map<string, any[]>();
    for (const p of (this.analise.produtos || [])) {
      const key = getLinhaKey(p);
      if (!linhasMap.has(key)) linhasMap.set(key, []);
      linhasMap.get(key)!.push(p);
    }

    // Ordenação (Premium primeiro)
    const linhasOrdenadas = Array.from(linhasMap.entries()).sort((a, b) => {
      const nomeA = a[0];
      if (nomeA.includes('premium')) return -1;
      return 1;
    });

    // =================================================================
    // LOOP PRINCIPAL (UMA TABELA POR GRUPO/LINHA)
    // =================================================================
    
    // Variável para controlar a posição Y. Na primeira iteração é fixa, nas próximas reinicia.
    let currentY = tableStartY;

    for (let i = 0; i < linhasOrdenadas.length; i++) {
      const [linhaKey, produtosDaLinha] = linhasOrdenadas[i];

      // Se não for a primeira tabela, adiciona nova página
      if (i > 0) {
        doc.addPage();
        currentY = tableStartY; // Reseta a altura para o topo da nova página
      }

      const body: RowInput[] = [];

      // --- ROW DE TÍTULO DA LINHA (Faixa Colorida) ---
      const labelLinha = this.deParaLinhas[linhaKey] || (linhaKey === 'outros' ? 'GERAL' : linhaKey.toUpperCase());
      const corRgb = this.hexToRgb(this.getCorHeader(linhaKey)) ?? [0, 64, 133];

      body.push([
        {
          content: labelLinha,
          colSpan: totalCols,
          styles: {
            fillColor: corRgb, // Cor do Header da Linha
            textColor: [255, 255, 255], // Branco no título
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
            return {
              content: `R$ ${this.formatCurrency(precoPrazo)}`,
              styles: { halign: 'right' as 'right' }
            };
          })
        ]);
      }

      // --- GERAÇÃO DA TABELA (AutoTable) ---
      autoTable(doc, {
        head: [headRow],
        body: body,
        startY: currentY,
        theme: 'striped', // Baseado em listras, vamos sobrescrever as cores abaixo

        styles: {
          font: 'helvetica',
          fontSize: 7,
          textColor: [0, 0, 0], // PRETO GERAL
          lineColor: [157, 157, 157], // #9D9D9D (Cinza das bordas)
          lineWidth: 0.1,
          cellPadding: 1.0, 
          valign: 'middle',
          overflow: 'linebreak'
        },

        headStyles: {
          fillColor: [215, 215, 215], // #D7D7D7 (Cinza claro do cabeçalho)
          textColor: [0, 0, 0],       // Preto
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [157, 157, 157] // #9D9D9D
        },

        bodyStyles: {
          textColor: [0, 0, 0] // Preto no corpo
        },

        alternateRowStyles: {
          fillColor: [238, 238, 238] // #EEEEEE (Cinza zebra)
        },

        // Definição explicita de colunas para evitar quebras ruins
        columnStyles: {
          0: { cellWidth: 24 }, // Código (Aumentado para não cortar)
          1: { cellWidth: 'auto' }, // Produto (Ocupa o que sobra)
          2: { cellWidth: 10 }, // Emb
          3: { cellWidth: 18 }, // Grupo
          // As colunas de preço (4 em diante) ficam automáticas distribuídas
        },

        margin: { top: tableStartY, left: marginX, right: marginX, bottom: 10 },
        
        // Garante cabeçalho em caso de quebra de página dentro do mesmo grupo
        showHead: 'everyPage' 
      });
    }

    // --- RODAPÉ/CABEÇALHO FIXO EM CADA PÁGINA ---
    const totalPages = doc.getNumberOfPages();
    const dataStr = new Date().toLocaleDateString('pt-BR');

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // LOGO
      if (logoBytes) {
        doc.addImage(logoBytes as any, 'PNG', marginX, headerStartInfo, 30, 12, undefined, 'FAST');
      }

      // Título Central
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0); // Preto
      doc.text('Tabela de Preços', pageW / 2, headerStartInfo + 8, { align: 'center' });

      // Página X de Y
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, headerStartInfo + 14, { align: 'center' });

      // Data Direita
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0); // Preto
      doc.text('VÁLIDA A PARTIR:', pageW - marginX, headerStartInfo + 5, { align: 'right' });
      
      doc.setTextColor(255, 0, 0); // Vermelho apenas na data
      doc.text(dataStr, pageW - marginX, headerStartInfo + 10, { align: 'right' });

      // Linha separadora do Header
      doc.setDrawColor(157, 157, 157); // #9D9D9D
      doc.setLineWidth(0.5);
      doc.line(marginX, headerStartInfo + 18, pageW - marginX, headerStartInfo + 18);
    }

    // Salvar
    const nomeLimpo = (this.analise.descricao || 'Geral').replace(/[^a-z0-9]/gi, '_');
    doc.save(`Tabela_Precos_${nomeLimpo}.pdf`);
  }

  // --- Helpers ---

  // Função para forçar quebra de linha nos Headers longos
  private wrapPrazoHeader(texto: string): string {
    const t = (texto || '').trim();
    // Quebra forçada antes de 'ou'
    if (t.includes(' ou ')) return t.replace(' ou ', '\nou ');
    // Quebra forçada nas barras
    if (t.includes('/')) return t.replace(/\//g, '/\n');
    // Quebra forçada em 'dias' se estiver no final de uma string longa
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