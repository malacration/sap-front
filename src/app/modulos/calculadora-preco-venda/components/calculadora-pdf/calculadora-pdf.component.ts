import { Component, Input, ElementRef, ViewChildren, QueryList, OnChanges, SimpleChanges } from '@angular/core';
import { Analise } from '../../models/analise';
import { Produto } from '../../models/produto';
import { PdfCarregamentoService } from '../../../../sap/service/pdf-carregamento.service';

interface GrupoRender {
  nomeGrupo: string; // Guarda o ID cru (ex: 'mega')
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
  @ViewChildren('printPage') printPages: QueryList<ElementRef>;

  public paginasParaImpressao: PaginaRender[] = [];
  
  // --- CONFIGURAÇÃO DE PAGINAÇÃO ---
  // Define quantas "linhas virtuais" cabem em uma página
  private readonly LINHAS_TOTAIS_POR_PAGINA = 23; 
  
  // Define quanto espaço visual um cabeçalho (Título Laranja + Cabeçalho Cinza) consome
  // Valor 5 significa que um cabeçalho ocupa o mesmo espaço que 5 produtos
  private readonly CUSTO_CABECALHO = 5; 

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
    if (!this.analise || !this.analise.produtos) return;

    // 1. Agrupamento inicial
    const gruposMap = new Map<string, Produto[]>();
    this.analise.produtos.forEach(produto => {
      const grupoKey = (produto as any).U_linha_sustennutri || 'OUTROS';
      if (!gruposMap.has(grupoKey)) gruposMap.set(grupoKey, []);
      gruposMap.get(grupoKey).push(produto);
    });

    const gruposOrdenados = Array.from(gruposMap, ([name, value]) => ({ nomeGrupo: name, produtos: value }))
      .sort((a, b) => {
        const nomeA = a.nomeGrupo.toLowerCase();
        const nomeB = b.nomeGrupo.toLowerCase();
        if (nomeA.includes('premium')) return -1;
        if (nomeB.includes('premium')) return 1;
        return 0;
      });

    // 2. Paginação Inteligente (Calculando espaços)
    this.paginasParaImpressao = [];
    
    let paginaAtual: PaginaRender = { grupos: [] };
    let espacoUsadoNaPagina = 0; // Contador de linhas usadas na página atual

    for (const grupoOriginal of gruposOrdenados) {
      
      // Verifica se cabe o cabeçalho novo + pelo menos 1 produto
      // Se não couber, cria nova página antes de começar o grupo
      if (espacoUsadoNaPagina + this.CUSTO_CABECALHO + 1 > this.LINHAS_TOTAIS_POR_PAGINA) {
         this.paginasParaImpressao.push(paginaAtual);
         paginaAtual = { grupos: [] };
         espacoUsadoNaPagina = 0;
      }

      // Adiciona o "custo" visual do cabeçalho deste grupo
      espacoUsadoNaPagina += this.CUSTO_CABECALHO;

      let grupoAtualNaPagina: GrupoRender = { 
        nomeGrupo: grupoOriginal.nomeGrupo, 
        produtos: [] 
      };

      for (const produto of grupoOriginal.produtos) {
        
        // Verifica se adicionar este produto vai estourar a página
        if (espacoUsadoNaPagina >= this.LINHAS_TOTAIS_POR_PAGINA) {
          
          // Salva o que já foi processado na página atual
          if (grupoAtualNaPagina.produtos.length > 0) {
            paginaAtual.grupos.push(grupoAtualNaPagina);
          }
          this.paginasParaImpressao.push(paginaAtual); // Fecha a página
          
          // Inicia Nova Página
          paginaAtual = { grupos: [] };
          espacoUsadoNaPagina = 0;
          
          // Como o grupo continua na nova página, ele vai ter cabeçalho de novo?
          // Sim, o HTML vai desenhar o cabeçalho novamente para o resto dos itens.
          // Então somamos o custo do cabeçalho novamente na nova página.
          espacoUsadoNaPagina += this.CUSTO_CABECALHO;

          grupoAtualNaPagina = { 
            nomeGrupo: grupoOriginal.nomeGrupo, 
            produtos: [] 
          };
        }

        // Adiciona o produto e conta +1 linha de espaço
        grupoAtualNaPagina.produtos.push(produto);
        espacoUsadoNaPagina++;
      }

      // Se sobrou itens no buffer do grupo, adiciona na página
      if (grupoAtualNaPagina.produtos.length > 0) {
        paginaAtual.grupos.push(grupoAtualNaPagina);
      }
    }

    // Adiciona a última página se tiver conteúdo
    if (paginaAtual.grupos.length > 0) {
      this.paginasParaImpressao.push(paginaAtual);
    }
  }

  // --- MÉTODOS AUXILIARES ---

  private deParaLinhas: { [key: string]: string } = {
    'especial': 'ESPECIAL',
    'fora': 'FORA DE LINHA',
    'mega': 'OX MEGA',
    'power': 'OX POWER',
    'premium': 'OX PREMIUM',
    'farelado': 'FARELADA',
    'terceiro': 'TERCEIROS'
  };

  getDescricaoLinha(codigo: string): string {
    if (!codigo) return '';
    const chave = codigo.toLowerCase().trim();
    return this.deParaLinhas[chave] || codigo.toUpperCase();
  }

  getCorHeader(nomeGrupo: string): string {
    const chave = nomeGrupo ? nomeGrupo.toLowerCase().trim() : '';
    if (chave === 'premium') return '#F26522';
    if (chave === 'mega') return '#FFC20E';
    if (chave === 'power') return '#777777';
    if (chave === 'suprema') return '#28a745';
    if (chave === 'especial') return '#004085';
    return '#004085';
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