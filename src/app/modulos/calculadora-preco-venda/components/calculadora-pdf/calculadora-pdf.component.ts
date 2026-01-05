import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Analise } from '../../models/analise';
import { Produto } from '../../models/produto';
import { PdfCarregamentoService } from '../../../../sap/service/pdf-carregamento.service';

interface GrupoRender {
  nomeGrupo: string;
  produtos: Produto[];
}

interface PaginaRender {
  grupos: GrupoRender[];
}

@Component({
  selector: 'app-calculadora-pdf',
  templateUrl: './calculadora-pdf.component.html',
})
export class CalculadoraPdfComponent implements OnChanges {
  @Input() analise: Analise;

  public paginasParaImpressao: PaginaRender[] = [];
  private readonly LINHAS_TOTAIS_POR_PAGINA = 23;
  private readonly CUSTO_CABECALHO = 5;

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

  constructor(private pdfService: PdfCarregamentoService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['analise'] && this.analise) {
      this.montarPaginas();
    }
  }

  public async gerarPdf() {
    const elements = document.querySelectorAll('.page-print-content') as NodeListOf<HTMLElement>;
    if (elements.length > 0) {
      await this.pdfService.gerarPdfMultiPagina(elements, `Tabela_Precos_${this.analise?.descricao || 'Geral'}`);
    }
  }

  private montarPaginas() {
    if (!this.analise?.produtos) return;

    const gruposMap = new Map<string, Produto[]>();
    this.analise.produtos.forEach(produto => {
      const grupoKey = (produto as any).U_linha_sustennutri || 'OUTROS';
      if (!gruposMap.has(grupoKey)) gruposMap.set(grupoKey, []);
      gruposMap.get(grupoKey).push(produto);
    });

    const gruposOrdenados = Array.from(gruposMap, ([name, value]) => ({ nomeGrupo: name, produtos: value }))
      .sort((a, b) => a.nomeGrupo.toLowerCase().includes('premium') ? -1 : 1);

    this.paginasParaImpressao = [];
    let paginaAtual: PaginaRender = { grupos: [] };
    let espacoUsadoNaPagina = 0;

    for (const grupoOriginal of gruposOrdenados) {
      if (espacoUsadoNaPagina + this.CUSTO_CABECALHO + 1 > this.LINHAS_TOTAIS_POR_PAGINA) {
        this.paginasParaImpressao.push(paginaAtual);
        paginaAtual = { grupos: [] };
        espacoUsadoNaPagina = 0;
      }

      espacoUsadoNaPagina += this.CUSTO_CABECALHO;
      let grupoAtualNaPagina: GrupoRender = { nomeGrupo: grupoOriginal.nomeGrupo, produtos: [] };

      for (const produto of grupoOriginal.produtos) {
        if (espacoUsadoNaPagina >= this.LINHAS_TOTAIS_POR_PAGINA) {
          if (grupoAtualNaPagina.produtos.length > 0) paginaAtual.grupos.push(grupoAtualNaPagina);
          this.paginasParaImpressao.push(paginaAtual);
          
          paginaAtual = { grupos: [] };
          espacoUsadoNaPagina = this.CUSTO_CABECALHO;
          grupoAtualNaPagina = { nomeGrupo: grupoOriginal.nomeGrupo, produtos: [] };
        }
        grupoAtualNaPagina.produtos.push(produto);
        espacoUsadoNaPagina++;
      }
      if (grupoAtualNaPagina.produtos.length > 0) paginaAtual.grupos.push(grupoAtualNaPagina);
    }
    if (paginaAtual.grupos.length > 0) this.paginasParaImpressao.push(paginaAtual);
  }

  getDescricaoLinha(codigo: string): string {
    const chave = codigo?.toLowerCase().trim();
    return this.deParaLinhas[chave] || codigo?.toUpperCase() || '';
  }

  getCorHeader(nomeGrupo: string): string {
    const cores: Record<string, string> = {
      'premium': '#F26522',
      'mega': '#FFC20E',
      'power': '#777777',
      'suprema': '#28a745',
      'especial': '#004085'
    };
    return cores[nomeGrupo?.toLowerCase().trim()] || '#004085';
  }

  getDescricaoGrupo(codigo: string): string {
    const chave = codigo?.toLowerCase().trim();
    return this.deParaGrupos[chave] || codigo?.toUpperCase() || '';
  }

  get dataAtual(): Date {
    return new Date();
  }
}