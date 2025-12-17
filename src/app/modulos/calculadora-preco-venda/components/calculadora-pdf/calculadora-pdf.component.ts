import { Component, Input, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { Analise } from '../../models/analise';
import { Produto } from '../../models/produto';
import { PdfCarregamentoService } from '../../../../sap/service/pdf-carregamento.service';

@Component({
  selector: 'app-calculadora-pdf',
  templateUrl: './calculadora-pdf.component.html',
})
export class CalculadoraPdfComponent {

  @Input() analise: Analise;
  @ViewChildren('printPage') printPages: QueryList<ElementRef>;

  constructor(private pdfService: PdfCarregamentoService) {}

  public async gerarPdf() {
    const elements = document.querySelectorAll('.page-print-content') as NodeListOf<HTMLElement>;
    if (elements.length > 0) {
      // Ajuste o nome do arquivo conforme necessidade
      await this.pdfService.gerarPdfMultiPagina(elements, `Tabela_Precos_${this.analise?.descricao || 'Geral'}`);
    }
  }

  get produtosAgrupados(): { nomeGrupo: string, produtos: Produto[] }[] {
    if (!this.analise || !this.analise.produtos) return [];

    const grupos = new Map<string, Produto[]>();

    this.analise.produtos.forEach(produto => {
      const grupoKey = (produto as any).U_linha_sustennutri || 'OUTROS'; 
      
      if (!grupos.has(grupoKey)) {
        grupos.set(grupoKey, []);
      }
      grupos.get(grupoKey).push(produto);
    });

    // Ordenação opcional: Tenta colocar PREMIUM primeiro se existir
    return Array.from(grupos, ([name, value]) => ({ nomeGrupo: name, produtos: value }))
      .sort((a, b) => {
        if (a.nomeGrupo.includes('PREMIUM')) return -1;
        if (b.nomeGrupo.includes('PREMIUM')) return 1;
        return 0;
      });
  }

  // Cores extraídas visualmente da imagem
  getCorHeader(nomeGrupo: string): string {
    const nome = nomeGrupo ? nomeGrupo.toUpperCase() : '';

    if (nome.includes('PREMIUM')) {
      return '#F26522'; // Laranja vibrante
    } else if (nome.includes('MEGA')) {
      return '#FFC20E'; // Amarelo Ouro/Mustarda
    } else if (nome.includes('POWER')) {
      return '#777777'; // Cinza Escuro
    } else if (nome.includes('SUPREMA')) {
      return '#28a745'; // Verde
    }
    
    return '#004085'; // Azul padrão fallback
  }

  private deParaGrupos: { [key: string]: string } = {
    'sal': 'SAL MINERAL',
    'racao': 'RAÇÃO',
    'quirela': 'QUIRERA',
    'nucleo': 'NÚCLEOS E CONCENTRADOS',
    'milho': 'MILHO',
    'fora': 'FORA DE LINHA',
    'farelo': 'FARELADA',
    'ener-prot': 'ENERGÉTICO - PROTEICO',
    'adensado': 'ADENSADO'
  }

  getDescricaoGrupo(codigo: string): string {
    if (!codigo) return '';
    const chave = codigo.toLowerCase().trim();
    return this.deParaGrupos[chave] || codigo.toUpperCase();
  }

  get dataAtual(): Date {
    return new Date();
  }
}