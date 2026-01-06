import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Analise } from '../../models/analise';
import { Produto } from '../../models/produto';
import { PdfCarregamentoService } from '../../../ordem-carregamento/service/pdf-carregamento.service';
import { PrazoPagamento } from '../../models/prazo-pagamento';

interface PrazoConfig { descricao: string; multiplicador: number; }

@Component({
  selector: 'app-calculadora-pdf',
  templateUrl: './calculadora-pdf.component.html',
  styleUrls: ['./calculadora-pdf.component.scss']
})
export class CalculadoraPdfComponent implements OnChanges {
  @Input() analise: Analise;

  public paginasParaImpressao: any[] = [];
  public readonly dataAtual = new Date();
  
  private readonly CONFIG = {
    LINHAS_POR_PAGINA: 23,
    CUSTO_CABECALHO: 5
  };

  private readonly deParaLinhas: Record<string, string> = {
    especial: 'ESPECIAL', fora: 'FORA DE LINHA', mega: 'OX MEGA',
    power: 'OX POWER', premium: 'OX PREMIUM', farelado: 'FARELADA', terceiro: 'TERCEIROS'
  };

  private readonly deParaGrupos: Record<string, string> = {'sal': 'SAL MINERAL','racao': 'RAÇÃO','quirela': 'QUIRERA', 'nucleo': 'NÚCLEOS E CONCENTRADOS', 'milho': 'MILHO','fora': 'FORA DE LINHA','farelo': 'FARELADA','ener-prot': 'ENERGÉTICO - PROTEICO','adensado': 'ADENSADO'};

  constructor(private pdfService: PdfCarregamentoService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['analise']?.currentValue) {
      this.montarPaginas();
    }
  }

  public getDescricaoGrupo(codigo: string): string {
    const chave = codigo?.toLowerCase().trim();
    return this.deParaGrupos[chave] || codigo?.toUpperCase() || '';
  }


  public async gerarPdf(): Promise<void> {
    const elements = document.querySelectorAll('.page-print-content') as NodeListOf<HTMLElement>;
    if (elements.length) {
      const nomeArquivo = `Tabela_Precos_${this.analise?.descricao || 'Geral'}`;
      await this.pdfService.gerarPdfMultiPagina(elements, nomeArquivo);
    }
  }

  private montarPaginas(): void {
    const produtos = this.analise?.produtos || [];
    const gruposOrdenados = this.agruparEOrdenarProdutos(produtos);
    
    this.paginasParaImpressao = [];
    let paginaAtual = { grupos: [] };
    let espacoOcupado = 0;

    for (const grupo of gruposOrdenados) {
      if (espacoOcupado + this.CONFIG.CUSTO_CABECALHO > this.CONFIG.LINHAS_POR_PAGINA) {
        this.finalizarPagina(paginaAtual);
        paginaAtual = { grupos: [] };
        espacoOcupado = 0;
      }

      espacoOcupado += this.CONFIG.CUSTO_CABECALHO;
      let grupoNaPagina = { nomeGrupo: grupo.nomeGrupo, produtos: [] };

      grupo.produtos.forEach(produto => {
        if (espacoOcupado >= this.CONFIG.LINHAS_POR_PAGINA) {
          paginaAtual.grupos.push(grupoNaPagina);
          this.finalizarPagina(paginaAtual);
          
          paginaAtual = { grupos: [] };
          grupoNaPagina = { nomeGrupo: grupo.nomeGrupo, produtos: [] };
          espacoOcupado = this.CONFIG.CUSTO_CABECALHO;
        }
        grupoNaPagina.produtos.push(produto);
        espacoOcupado++;
      });

      if (grupoNaPagina.produtos.length) paginaAtual.grupos.push(grupoNaPagina);
    }
    this.finalizarPagina(paginaAtual);
  }

  private agruparEOrdenarProdutos(produtos: Produto[]) {
    const gruposMap = new Map<string, Produto[]>();
    
    produtos.forEach(p => {
      const key = (p as any).U_linha_sustennutri || 'OUTROS';
      if (!gruposMap.has(key)) gruposMap.set(key, []);
      gruposMap.get(key).push(p);
    });

    return Array.from(gruposMap, ([nomeGrupo, produtos]) => ({ nomeGrupo, produtos }))
      .sort((a, b) => a.nomeGrupo.toLowerCase().includes('premium') ? -1 : 1);
  }

  private finalizarPagina(pagina: any): void {
    if (pagina.grupos.length) this.paginasParaImpressao.push(pagina);
  }

  public getCorHeader(nomeGrupo: string): string {
    const cores: Record<string, string> = {
      premium: '#F26522', mega: '#FFC20E', power: '#777777', suprema: '#28a745'
    };
    return cores[nomeGrupo?.toLowerCase().trim()] || '#004085';
  }

  public getDescricaoLinha(codigo: string): string {
    return this.deParaLinhas[codigo?.toLowerCase().trim()] || codigo?.toUpperCase() || '';
  }
}