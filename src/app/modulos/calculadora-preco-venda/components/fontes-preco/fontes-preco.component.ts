import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { LastPrice } from '../../models/last-price';
import { CalculadoraService } from '../../service/calculadora.service';

/** Uma linha da tabela: de onde vem o preco e quanto ele da por unidade de estoque. */
export interface FontePreco {
  codigo: string;
  descricao: string;
  preco: number;
  /** Frete por unidade de estoque; null quando a fonte nao separa o frete. */
  frete: number | null;
  total: number;
  observacao?: string;
}

/**
 * Lista as fontes de preco de um item (endpoint last-price do sap-service) para escolher qual vira o
 * custo da materia-prima. Todo valor e por unidade de ESTOQUE do item (grupo de unidades do SAP),
 * que normalmente e quilo; a receita tambem pede o custo nessa unidade.
 *
 * Entrada: o item (e o deposito, que o endpoint exige). Saida: o preco escolhido em
 * (precoSelecionado) ou (fechar) para sair sem mudar nada.
 */
@Component({
  selector: 'fontes-preco',
  templateUrl: './fontes-preco.component.html',
})
export class FontesPrecoComponent implements OnChanges, OnDestroy {

  @Input() itemCode: string;
  @Input() deposito: string;
  @Input() descricao?: string;
  /** Opcional: o custo que esta em uso, para comparar. */
  @Input() precoAtual?: number | null;
  /** Opcional: unidade da materia-prima na receita; avisa se nao for a unidade de estoque. */
  @Input() unidadeReceita?: string | null;

  @Output() precoSelecionado = new EventEmitter<number>();
  @Output() fechar = new EventEmitter<void>();

  carregando = false;
  erro: string | null = null;
  dados: LastPrice | null = null;
  fontes: FontePreco[] = [];
  selecionada: string | null = null;

  private sub?: Subscription;

  constructor(private service: CalculadoraService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['itemCode'] || changes['deposito']) {
      this.carregar();
    }
  }

  carregar(): void {
    this.sub?.unsubscribe();
    this.dados = null;
    this.fontes = [];
    this.selecionada = null;
    this.erro = null;
    if (!this.itemCode) {
      return;
    }
    this.carregando = true;
    this.sub = this.service.getLastPrice(this.itemCode, this.deposito).subscribe({
      next: (lista) => {
        this.carregando = false;
        this.dados = lista?.[0] ?? null;
        if (!this.dados) {
          this.erro = `O item ${this.itemCode} não tem registro no depósito ${this.deposito ?? '(não informado)'}.`;
          return;
        }
        this.fontes = FontesPrecoComponent.montarFontes(this.dados);
        this.selecionada = this.fontes[0]?.codigo ?? null;
      },
      error: () => {
        this.carregando = false;
        this.erro = 'Não foi possível consultar os preços do item.';
      },
    });
  }

  static montarFontes(d: LastPrice): FontePreco[] {
    const n = (v: number | null | undefined) => Number(v) || 0;
    const fontes: FontePreco[] = [];
    if (d.UltimaNf) {
      fontes.push({
        codigo: 'compraComFrete',
        descricao: 'Última NF de entrada + frete (CTe)',
        preco: n(d.PrecoUltimaNfUnEstoque),
        frete: n(d.FreteUnEstoque),
        total: n(d.CustoComFreteUnEstoque),
        observacao: n(d.QtdCtesUltimaNf) === 0 ? 'Nenhum CTe vinculado à nota' : undefined,
      });
      fontes.push({
        codigo: 'compraSemFrete',
        descricao: 'Última NF de entrada (sem frete)',
        preco: n(d.PrecoUltimaNfUnEstoque),
        frete: null,
        total: n(d.PrecoUltimaNfUnEstoque),
      });
    }
    fontes.push(
      { codigo: 'contabil', descricao: 'Custo contábil (médio do depósito)', preco: n(d.AvgPrice), frete: null, total: n(d.AvgPrice) },
      { codigo: 'analisado', descricao: 'Último preço analisado (SAP)', preco: n(d.LstEvlPric), frete: null, total: n(d.LstEvlPric) },
      {
        codigo: 'cadastroCompra',
        descricao: 'Último preço de compra (cadastro SAP)',
        preco: n(d.LastPurPrc),
        frete: null,
        total: n(d.LastPurPrc),
        observacao: 'Pode estar na unidade de compra',
      },
      {
        codigo: 'producao',
        descricao: 'Custo apontado p/ produção',
        preco: n(d.U_productionCost),
        frete: null,
        total: n(d.U_productionCost),
      },
    );
    return fontes;
  }

  get fonteSelecionada(): FontePreco | undefined {
    return this.fontes.find(it => it.codigo === this.selecionada);
  }

  get unidadeDiferente(): boolean {
    const estoque = this.dados?.InvntryUom?.trim().toLowerCase();
    const receita = this.unidadeReceita?.trim().toLowerCase();
    return !!estoque && !!receita && estoque !== receita;
  }

  get temPrecoAtual(): boolean {
    return this.precoAtual !== null && this.precoAtual !== undefined;
  }

  selecionar(codigo: string): void {
    this.selecionada = codigo;
  }

  usar(): void {
    const fonte = this.fonteSelecionada;
    if (fonte) {
      this.precoSelecionado.emit(fonte.total);
    }
  }

  /** DocDate do Service Layer vem como texto ISO; se nao for data, mostra como veio. */
  dataNf(): string {
    const texto = this.dados?.UltimaNf?.DocDate;
    if (!texto) {
      return '';
    }
    const data = new Date(texto);
    return isNaN(data.getTime()) ? texto : data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
