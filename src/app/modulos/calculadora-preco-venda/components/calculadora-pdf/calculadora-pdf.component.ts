import { Component, Input, ElementRef, ViewChildren, QueryList, OnChanges, SimpleChanges } from '@angular/core';
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
  @ViewChildren('printPage') printPages: QueryList<ElementRef>;

  public paginasParaImpressao: PaginaRender[] = [];
  
  private readonly ITENS_POR_PAGINA = 25;

  constructor(private pdfService: PdfCarregamentoService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['analise'] && this.analise) {
      this.montarPaginas();
    }
  }

  public async gerarPdf() {
    // Seleciona TODAS as páginas geradas pelo ngFor
    const elements = document.querySelectorAll('.page-print-content') as NodeListOf<HTMLElement>;
    if (elements.length > 0) {
      await this.pdfService.gerarPdfMultiPagina(elements, `Tabela_Precos_${this.analise?.descricao || 'Geral'}`);
    }
  }

  private montarPaginas() {
    if (!this.analise || !this.analise.produtos) return;

    // 1. Primeiro agrupa tudo (lógica original)
    const gruposMap = new Map<string, Produto[]>();
    this.analise.produtos.forEach(produto => {
      const grupoKey = (produto as any).U_linha_sustennutri || 'OUTROS';
      if (!gruposMap.has(grupoKey)) gruposMap.set(grupoKey, []);
      gruposMap.get(grupoKey).push(produto);
    });

    const gruposOrdenados = Array.from(gruposMap, ([name, value]) => ({ nomeGrupo: name, produtos: value }))
      .sort((a, b) => {
        if (a.nomeGrupo.includes('PREMIUM')) return -1;
        if (b.nomeGrupo.includes('PREMIUM')) return 1;
        return 0;
      });

    // 2. Agora fatiamos em páginas de 20 itens
    this.paginasParaImpressao = [];
    
    let paginaAtual: PaginaRender = { grupos: [] };
    let contadorItensPagina = 0;
    
    for (const grupoOriginal of gruposOrdenados) {
      
      // Criamos um grupo temporário para a página atual
      let grupoAtualNaPagina: GrupoRender = { 
        nomeGrupo: grupoOriginal.nomeGrupo, 
        produtos: [] 
      };

      for (const produto of grupoOriginal.produtos) {
        
        // Se atingiu o limite, salva a página e cria nova
        if (contadorItensPagina >= this.ITENS_POR_PAGINA) {
          
          // Se o grupo atual tem itens, salva ele na página antes de fechar
          if (grupoAtualNaPagina.produtos.length > 0) {
            paginaAtual.grupos.push(grupoAtualNaPagina);
          }

          this.paginasParaImpressao.push(paginaAtual); // Empurra página cheia
          
          // Reseta para nova página
          paginaAtual = { grupos: [] };
          contadorItensPagina = 0;
          
          // Cria novo container de grupo para a nova página (repete o nome do grupo)
          grupoAtualNaPagina = { 
            nomeGrupo: grupoOriginal.nomeGrupo, 
            produtos: [] 
          };
        }

        // Adiciona produto e incrementa contador
        grupoAtualNaPagina.produtos.push(produto);
        contadorItensPagina++;
      }

      // Acabou os produtos desse grupo original. 
      // Se sobrou algo no grupo temporário, adiciona na página atual
      if (grupoAtualNaPagina.produtos.length > 0) {
        paginaAtual.grupos.push(grupoAtualNaPagina);
      }
    }

    // Se sobrou alguma página aberta no final, adiciona ao array
    if (paginaAtual.grupos.length > 0) {
      this.paginasParaImpressao.push(paginaAtual);
    }
  }

  // --- MÉTODOS AUXILIARES VISUAIS ---

  getCorHeader(nomeGrupo: string): string {
    const nome = nomeGrupo ? nomeGrupo.toUpperCase() : '';
    if (nome.includes('PREMIUM')) return '#F26522';
    if (nome.includes('MEGA')) return '#FFC20E';
    if (nome.includes('POWER')) return '#777777';
    if (nome.includes('SUPREMA')) return '#28a745';
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