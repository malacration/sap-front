import { Component, Input } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { Regiao } from '../../../model/regiao/regiao';
import { Localidade } from '../../../model/localidade/localidade';

export class RegiaoDadosImpressao {
  regiao : Regiao;
  localidades : Array<Localidade>;
}

@Component({
  selector: 'app-regiao-frete-pdf',
  template: ''
})
export class RegiaoFretePdfComponent {

  @Input() regiao : Regiao;
  @Input() localidades : Array<Localidade> = [];

  gerarPdf(): void {
    if (!this.regiao) return;
    const doc = this.novoDocumento();
    this.montarPaginaRegiao(doc, this.regiao, this.localidades);
    this.finalizarDocumento(doc, `Tabela_Frete_${this.regiao.Code}`);
  }

  gerarPdfTodasRegioes(dados : Array<RegiaoDadosImpressao>): void {
    const validas = (dados || []).filter(d =>
      (d.localidades || []).length > 0 && (d.regiao?.getFaixasOrdenadas() || []).length > 0
    );
    if (validas.length == 0) return;

    const doc = this.novoDocumento();
    validas.forEach((dado, index) => {
      if (index > 0) doc.addPage();
      this.montarPaginaRegiao(doc, dado.regiao, dado.localidades);
    });
    this.finalizarDocumento(doc, 'Tabela_Frete_Todas_Regioes');
  }

  private novoDocumento(): jsPDF {
    return new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  }

  //desenha o titulo da regiao e a tabela de frete dela na pagina atual do documento
  private montarPaginaRegiao(doc : jsPDF, regiao : Regiao, localidades : Array<Localidade>): void {
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 10;
    const tableStartY = 25;
    const nomeRegiao = regiao.U_NomeRegiao || regiao.Name || regiao.Code;

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`Tabela de Frete - ${nomeRegiao} (${regiao.Code})`, pageW / 2, 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Valores em R$ por unidade transportada', pageW / 2, 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageW - marginX, 12, { align: 'right' });

    const faixas = regiao.getFaixasOrdenadas();
    //colunas mais estreitas e faceis de ler: cada faixa mostra um intervalo
    //fechado ate a proxima cadastrada (ex.: faixas em 1 e 51 viram "1 a 50" e
    //"Acima de 51"), em vez de "A partir de X" repetido em toda coluna
    const faixaHeaders = faixas.map((f, i) => {
      const proxima = faixas[i + 1];
      const label = proxima
        ? `${f.U_QtdeAte} a ${proxima.U_QtdeAte - 1} itens`
        : `Acima de ${f.U_QtdeAte} itens`;
      return {
        content: label,
        styles: { fontStyle: 'bold' as 'bold', halign: 'center' as 'center' }
      };
    });

    const headRow = [
      { content: 'Localidade', styles: { fontStyle: 'bold' as 'bold', halign: 'left' as 'left' } },
      { content: 'Distância (km)', styles: { fontStyle: 'bold' as 'bold', halign: 'center' as 'center' } },
      ...faixaHeaders
    ];

    const grupos = this.agruparPorDistancia(regiao, localidades);

    const body: RowInput[] = grupos.map(grupo => {
      return [
        { content: grupo.nomes, styles: { halign: 'left' as 'left' } },
        { content: grupo.distancia != null ? this.formatNumero(grupo.distancia) : '-', styles: { halign: 'center' as 'center' } },
        ...faixas.map(faixa => {
          //U_ValorKm e o valor a cada 100km, nao por km
          const valor = grupo.distancia != null ? (grupo.distancia / 100) * (faixa.U_ValorKm || 0) : null;
          return {
            content: valor != null ? `R$ ${this.formatCurrency(valor)}` : '-',
            styles: { halign: 'right' as 'right' }
          };
        })
      ];
    });

    autoTable(doc, {
      head: [headRow],
      body,
      startY: tableStartY,
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [0, 0, 0],
        lineColor: [157, 157, 157],
        lineWidth: 0.1,
        cellPadding: 1.5,
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
      alternateRowStyles: {
        fillColor: [238, 238, 238]
      },
      margin: { top: tableStartY, left: marginX, right: marginX, bottom: 10 },
      showHead: 'everyPage'
    });
  }

  /**
   * Localidades com a mesma distancia tem o mesmo preco em todas as faixas
   * (preco = distancia x valorKm da faixa, igual pra toda a regiao), entao
   * agrupamos numa linha so, com os nomes separados por virgula - igual a
   * tabela de frete que o cliente ja usa hoje fora do sistema.
   */
  private agruparPorDistancia(regiao : Regiao, localidades : Array<Localidade>): Array<{ nomes : string, distancia : number | null }> {
    const porDistancia = new Map<number, Array<string>>();
    const semDistancia : Array<string> = [];

    (localidades || []).forEach(localidade => {
      const distancia = regiao.getDistancia(localidade.Code);
      const nome = localidade.Name || localidade.Code;
      if (distancia == null) {
        semDistancia.push(nome);
        return;
      }
      if (!porDistancia.has(distancia)) porDistancia.set(distancia, []);
      porDistancia.get(distancia)!.push(nome);
    });

    const grupos = Array.from(porDistancia.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([distancia, nomes]) => ({
        nomes: nomes.sort((a, b) => a.localeCompare(b)).join(', '),
        distancia
      }));

    if (semDistancia.length > 0) {
      grupos.push({
        nomes: semDistancia.sort((a, b) => a.localeCompare(b)).join(', '),
        distancia: null
      });
    }

    return grupos;
  }

  //numeracao de pagina aplicada no final, sobre o documento inteiro (pode ter varias regioes)
  private finalizarDocumento(doc : jsPDF, nomeBase : string): void {
    const totalPages = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 6, { align: 'center' });
    }

    //abre em nova aba pra visualizacao; se o navegador bloquear o popup (ex.: sem
    //ser resultado direto de um clique), cai pro download normal
    const blobUrl = doc.output('bloburl').toString();
    const novaAba = window.open(blobUrl, '_blank');
    if(!novaAba){
      const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      doc.save(`${nomeBase}_${dataArquivo}.pdf`);
    }
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatNumero(value: number): string {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
}
