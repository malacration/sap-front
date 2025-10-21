import Big from 'big.js';
import { RouteLink } from '../../../sap/model/route-link';
import { Action, ActionReturn } from '../../../shared/components/action/action.model';

const PRODUTO_PARENT = Symbol('produto_parent');

interface ProdutoMetrics {
  custoBase: number;
  custoReceitaCurrency: number;
  sacoPorTon: number;
  custoMateriaTonCurrency: number;
  creditoPisCofinsCurrency: number;
  perdasCurrency: number;
  subTotalPisCofinsCompra: number;
  subTotalPerdas: number;
  custoGgfTonelada: number;
  subTotalGGF: number;
  subTotalCaridade: number;
  subTotalDespesas: number;
  jurosFinanceiro: number;
  subTotalFinanceiro: number;
  precoInvalido: boolean;
  precoComRepasseCurrency: number;
  debitoPisCofinsCurrency: number;
  custoComissao: number;
  totalCustos: number;
  margemPorTonelada: number;
  precoSacoCurrency: number;
  margemLiquidaSacoCurrency: number;
}

export class Produto {
  Descricao: string;
  UnidadeMedida: string;
  ItemCode: string;
  DefaultWareHouse: string;

  private _KgsPorUnidade = 0;
  get KgsPorUnidade(): number {
    return this._KgsPorUnidade;
  }
  set KgsPorUnidade(value: number) {
    this._KgsPorUnidade = this.toNumber(value);
    this.bumpVersion();
  }

  private _CustoMateriaPrimaCurrency = 0;
  get CustoMateriaPrimaCurrency(): number {
    return this._CustoMateriaPrimaCurrency;
  }
  set CustoMateriaPrimaCurrency(value: number) {
    this._CustoMateriaPrimaCurrency = this.toNumber(value);
    this.bumpVersion();
  }

  private _CustoGgf = 0;
  get CustoGgf(): number {
    return this._CustoGgf;
  }
  set CustoGgf(value: number) {
    this._CustoGgf = this.toNumber(value);
    this.bumpVersion();
  }

  private _QuantidadeNaReceita = 0;
  get QuantidadeNaReceita(): number {
    return this._QuantidadeNaReceita;
  }
  set QuantidadeNaReceita(value: number) {
    this._QuantidadeNaReceita = this.toNumber(value);
    this.bumpVersion();
  }

  private _perdasPercentEditable = 0;
  get perdasPercentEditable(): number {
    return this._perdasPercentEditable;
  }
  set perdasPercentEditable(value: number) {
    this._perdasPercentEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _caridadeCurrencyEditable = 0;
  get caridadeCurrencyEditable(): number {
    return this._caridadeCurrencyEditable;
  }
  set caridadeCurrencyEditable(value: number) {
    this._caridadeCurrencyEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _margemPercentEditable = 0;
  get margemPercentEditable(): number {
    return this._margemPercentEditable;
  }
  set margemPercentEditable(value: number) {
    this._margemPercentEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _despesasCurrencyEditable = 0;
  get despesasCurrencyEditable(): number {
    return this._despesasCurrencyEditable;
  }
  set despesasCurrencyEditable(value: number) {
    this._despesasCurrencyEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _financeiroPercentEditable = 0;
  get financeiroPercentEditable(): number {
    return this._financeiroPercentEditable;
  }
  set financeiroPercentEditable(value: number) {
    this._financeiroPercentEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _marketingPercentEditable = 0;
  get marketingPercentEditable(): number {
    return this._marketingPercentEditable;
  }
  set marketingPercentEditable(value: number) {
    this._marketingPercentEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _tabelaPercentEditable = 0;
  get tabelaPercentEditable(): number {
    return this._tabelaPercentEditable;
  }
  set tabelaPercentEditable(value: number) {
    this._tabelaPercentEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _creditoTaxaPisCofinsPercentEditable = 0;
  get creditoTaxaPisCofinsPercentEditable(): number {
    return this._creditoTaxaPisCofinsPercentEditable;
  }
  set creditoTaxaPisCofinsPercentEditable(value: number) {
    console.log("set funcionando")
    this._creditoTaxaPisCofinsPercentEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _debitoTaxaPisCofinsPercentEditable = 0;
  get debitoTaxaPisCofinsPercentEditable(): number {
    return this._debitoTaxaPisCofinsPercentEditable;
  }
  set debitoTaxaPisCofinsPercentEditable(value: number) {
    this._debitoTaxaPisCofinsPercentEditable = this.toNumber(value);
    this.bumpVersion();
  }

  private _qtdPlanejada = 1;
  get qtdPlanejada(): number {
    return this._qtdPlanejada;
  }
  set qtdPlanejada(value: number) {
    this._qtdPlanejada = this.toNumber(value, 1);
    this.bumpVersion();
  }

  private _useCustoSap = true;
  get useCustoSap(): boolean {
    return this._useCustoSap;
  }
  set useCustoSap(value: boolean) {
    this._useCustoSap = Boolean(value);
    this.bumpVersion();
  }

  private _periodoJuros = 120;
  get periodoJuros(): number {
    return this._periodoJuros;
  }
  set periodoJuros(value: number) {
    this._periodoJuros = Math.max(0, Math.trunc(this.toNumber(value)));
    this.bumpVersion();
  }

  private _calculoJuros: 'mes' | 'dia' = 'mes';
  get calculoJuros(): 'mes' | 'dia' {
    return this._calculoJuros;
  }
  set calculoJuros(value: 'mes' | 'dia') {
    this._calculoJuros = value === 'dia' ? 'dia' : 'mes';
    this.bumpVersion();
  }

  private _ingredientes: Produto[] = [];
  get Ingredientes(): Array<Produto> {
    return this._ingredientes;
  }
  set Ingredientes(value: Array<Produto>) {
    const list = Array.isArray(value) ? value : [];
    this._ingredientes = list.map((item) => this.toProdutoInstance(item));
    this.bumpVersion();
  }

  private _custoMateriaPrimaEditable: number | undefined;
  get custoMateriaPrimaCurrencyEditable(): number {
    return this._custoMateriaPrimaEditable ?? this.CustoMateriaPrimaCurrency;
  }
  set custoMateriaPrimaCurrencyEditable(value: number) {
    if (value === null || value === undefined) {
      this._custoMateriaPrimaEditable = undefined;
    } else {
      this._custoMateriaPrimaEditable = this.toNumber(value);
    }
    this.bumpVersion();
  }

  private _custoGgfTonelada: number | null = null;
  get custoGgfToneladaEditable(): number {
    if (this._custoGgfTonelada !== null && this._custoGgfTonelada !== undefined) {
      return this._custoGgfTonelada;
    }
    return this.TONELADA.times(this.CustoGgf || 0).toNumber();
  }
  set custoGgfToneladaEditable(valor: number) {
    this._custoGgfTonelada = this.toNumber(valor);
    this.bumpVersion();
  }

  private _version = 0;
  private _metricsVersion = -1;
  private _metricsCache: ProdutoMetrics | null = null;
  private [PRODUTO_PARENT]?: Produto;

  get version(): number {
    return this._version;
  }

  get TONELADA(): Big {
    return new Big(1000);
  }

  set TONELADA(_: Big) {
    // Apenas para compatibilidade com serialização
  }

  get id(): RouteLink {
    return new RouteLink(this.ItemCode, null, { id: this.ItemCode });
  }

  getCusto(): number {
    return this.useCustoSap ? this.CustoMateriaPrimaCurrency : this.getCustoReceitaCurrency();
  }

  getSacoTon(): number {
    return this.ensureMetrics().sacoPorTon;
  }

  getCustoMateriaTonCurrency(): number {
    return this.ensureMetrics().custoMateriaTonCurrency;
  }

  getCreditoPisCofinsCurrency(): number {
    return this.ensureMetrics().creditoPisCofinsCurrency;
  }

  getPerdasCurrency(): number {
    return this.ensureMetrics().perdasCurrency;
  }

  debitoPisCofinsCurrency(): number {
    const metrics = this.ensureMetrics();
    if (metrics.precoInvalido) {
      throw new Error('Soma de comissão+impostos deve ser < 100%.');
    }
    return metrics.debitoPisCofinsCurrency;
  }

  getCustoReceitaCurrency(): number {
    return this.ensureMetrics().custoReceitaCurrency;
  }

  getTotalMateriaPrimaCurrency(): number {
    return new Big(this.QuantidadeNaReceita || 0)
      .times(new Big(this.custoMateriaPrimaCurrencyEditable || 0))
      .toNumber();
  }

  getTotalMateriaPrimaComPlanejadoCurrency(): number {
    return new Big(this.QuantidadeNaReceita || 0)
      .times(new Big(this.qtdPlanejada || 0))
      .times(new Big(this.custoMateriaPrimaCurrencyEditable || 0))
      .toNumber();
  }

  getActions(): Action[] {
    return [new Action('', new ActionReturn('delete', this), 'fas fa-trash')];
  }

  subTotalPisCofinsCompra(): number {
    return this.ensureMetrics().subTotalPisCofinsCompra;
  }

  subTotalPerdas(): number {
    return this.ensureMetrics().subTotalPerdas;
  }

  subTotalGGF(): number {
    return this.ensureMetrics().subTotalGGF;
  }

  subTotalCaridade(): number {
    return this.ensureMetrics().subTotalCaridade;
  }

  subTotalDespesas(): number {
    return this.ensureMetrics().subTotalDespesas;
  }

  getJurosCurrency(): number {
    return this.getJurosFinanceiro();
  }

  custoComissaoCurrency(): number {
    return this.custoComissao();
  }

  getJurosFinanceiro(): number {
    return this.ensureMetrics().jurosFinanceiro;
  }

  subTotalFinanceiro(): number {
    return this.ensureMetrics().subTotalFinanceiro;
  }

  precoComRepasseCurrency(): number {
    const metrics = this.ensureMetrics();
    if (metrics.precoInvalido) {
      throw new Error('Soma de comissão+impostos deve ser < 100%.');
    }
    return metrics.precoComRepasseCurrency;
  }

  basePisCofinsCurrency(): number {
    return this.precoComRepasseCurrency();
  }

  custoComissao(): number {
    const metrics = this.ensureMetrics();
    if (metrics.precoInvalido) {
      throw new Error('Soma de comissão+impostos deve ser < 100%.');
    }
    return metrics.custoComissao;
  }

  totalCustos(): number {
    const metrics = this.ensureMetrics();
    if (metrics.precoInvalido) {
      throw new Error('Soma de comissão+impostos deve ser < 100%.');
    }
    return metrics.totalCustos;
  }

  maregemPorToneladaCurrency(): number {
    return this.maregemPorTonelada();
  }

  maregemPorTonelada(): number {
    const metrics = this.ensureMetrics();
    if (metrics.precoInvalido) {
      throw new Error('Soma de comissão+impostos deve ser < 100%.');
    }
    return metrics.margemPorTonelada;
  }

  getPrecoSacoCurrency(): number {
    const metrics = this.ensureMetrics();
    if (metrics.precoInvalido) {
      throw new Error('Soma de comissão+impostos deve ser < 100%.');
    }
    return metrics.precoSacoCurrency;
  }

  mergemLiquidaSacoCurrency(): number {
    const metrics = this.ensureMetrics();
    if (metrics.precoInvalido) {
      throw new Error('Soma de comissão+impostos deve ser < 100%.');
    }
    return metrics.margemLiquidaSacoCurrency;
  }

  private ensureMetrics(): ProdutoMetrics {
    if (!this._metricsCache || this._metricsVersion !== this._version) {
      this._metricsCache = this.computeMetrics();
      this._metricsVersion = this._version;
    }
    return this._metricsCache;
  }

  private computeMetrics(): ProdutoMetrics {
    const ingredientes = this._ingredientes || [];
    const custoReceitaCurrency = ingredientes.reduce(
      (acc, item) => acc + item.getTotalMateriaPrimaCurrency(),
      0
    );

    const custoBase = this.useCustoSap ? this.CustoMateriaPrimaCurrency : custoReceitaCurrency;

    const sacoTonBig =
      this.KgsPorUnidade && this.KgsPorUnidade !== 0
        ? this.TONELADA.div(new Big(this.KgsPorUnidade))
        : new Big(0);
    const sacoPorTon = Number(sacoTonBig.toFixed(2));
    const custoMateriaTonCurrency = Number(
      sacoTonBig.times(new Big(custoBase || 0)).toFixed(10)
    );

    const creditoPisCofinsCurrency = Number(
      new Big(custoMateriaTonCurrency || 0)
        .times(new Big(this.creditoTaxaPisCofinsPercentEditable || 0))
        .toFixed(10)
    );

    const perdasCurrency = Number(
      new Big(this.perdasPercentEditable || 0)
        .times(new Big(custoMateriaTonCurrency || 0))
        .minus(
          new Big(this.perdasPercentEditable || 0).times(new Big(creditoPisCofinsCurrency || 0))
        )
        .toFixed(10)
    );

    const subTotalPisCofinsCompra = custoMateriaTonCurrency - creditoPisCofinsCurrency;
    const subTotalPerdas = subTotalPisCofinsCompra + perdasCurrency;

    const custoGgfTonelada =
      this._custoGgfTonelada !== null && this._custoGgfTonelada !== undefined
        ? this._custoGgfTonelada
        : this.TONELADA.times(this.CustoGgf || 0).toNumber();

    const subTotalGGF = subTotalPerdas + custoGgfTonelada;
    const subTotalCaridade = subTotalGGF + (this.caridadeCurrencyEditable || 0);
    const subTotalDespesas = subTotalCaridade + (this.despesasCurrencyEditable || 0);

    const jurosFinanceiro = this.computeJurosFinanceiroInternal(subTotalDespesas);
    const subTotalFinanceiro = subTotalDespesas + jurosFinanceiro;

    const margem = this.margemPercentEditable || 0;
    const debito = this.debitoTaxaPisCofinsPercentEditable || 0;
    const tabela = this.tabelaPercentEditable || 0;
    const denominador = 1 - (tabela + debito);

    if (denominador <= 0) {
      return {
        custoBase,
        custoReceitaCurrency,
        sacoPorTon,
        custoMateriaTonCurrency,
        creditoPisCofinsCurrency,
        perdasCurrency,
        subTotalPisCofinsCompra,
        subTotalPerdas,
        custoGgfTonelada,
        subTotalGGF,
        subTotalCaridade,
        subTotalDespesas,
        jurosFinanceiro,
        subTotalFinanceiro,
        precoInvalido: true,
        precoComRepasseCurrency: NaN,
        debitoPisCofinsCurrency: NaN,
        custoComissao: NaN,
        totalCustos: NaN,
        margemPorTonelada: NaN,
        precoSacoCurrency: NaN,
        margemLiquidaSacoCurrency: NaN,
      };
    }

    const precoComRepasseCurrency =
      subTotalFinanceiro * (1 + margem) / denominador;
    const debitoPisCofinsCurrency = precoComRepasseCurrency * debito;
    const custoComissao = precoComRepasseCurrency * tabela;
    const totalCustos = debitoPisCofinsCurrency + custoComissao;
    const margemPorTonelada = precoComRepasseCurrency - totalCustos - subTotalFinanceiro;

    const precoSacoCurrency =
      sacoPorTon && Number.isFinite(precoComRepasseCurrency / sacoPorTon)
        ? precoComRepasseCurrency / sacoPorTon
        : 0;
    const margemLiquidaSacoCurrency =
      sacoPorTon && Number.isFinite(margemPorTonelada / sacoPorTon)
        ? margemPorTonelada / sacoPorTon
        : 0;

    return {
      custoBase,
      custoReceitaCurrency,
      sacoPorTon,
      custoMateriaTonCurrency,
      creditoPisCofinsCurrency,
      perdasCurrency,
      subTotalPisCofinsCompra,
      subTotalPerdas,
      custoGgfTonelada,
      subTotalGGF,
      subTotalCaridade,
      subTotalDespesas,
      jurosFinanceiro,
      subTotalFinanceiro,
      precoInvalido: false,
      precoComRepasseCurrency,
      debitoPisCofinsCurrency,
      custoComissao,
      totalCustos,
      margemPorTonelada,
      precoSacoCurrency,
      margemLiquidaSacoCurrency,
    };
  }

  private computeJurosFinanceiroInternal(base: number): number {
    const valorBase = new Big(base ?? 0);
    if (valorBase.eq(0)) {
      return 0;
    }

    const taxaDecimal = new Big(this.financeiroPercentEditable ?? 0);
    let taxaDia: Big;

    if (this.calculoJuros === 'mes') {
      const baseCalc = 1 + Number(taxaDecimal);
      const iDiaNum = Math.pow(baseCalc, 1 / 30) - 1;
      taxaDia = new Big(iDiaNum < 0 ? 0 : iDiaNum);
    } else {
      taxaDia = taxaDecimal;
    }

    const dias = Math.max(0, Math.trunc(this.periodoJuros || 0));
    if (dias === 0 || taxaDia.eq(0)) {
      return 0;
    }

    const fator = Big(1).plus(taxaDia).pow(dias);
    const montante = fator.times(valorBase);
    const jurosApenas = montante.minus(valorBase);

    return Number(jurosApenas.toFixed(10));
  }

  private toProdutoInstance(value: Produto | any): Produto {
    if (value instanceof Produto) {
      value.attachParent(this);
      return value;
    }

    const novo = new Produto();
    novo.attachParent(this);
    return Object.assign(novo, value);
  }

  private attachParent(parent?: Produto): void {
    this[PRODUTO_PARENT] = parent;
  }

  private bumpVersion(): void {
    this._version++;
    this._metricsVersion = -1;
    const parent = this[PRODUTO_PARENT];
    if (parent) {
      parent.bumpVersion();
    }
  }

  private toNumber(value: any, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
