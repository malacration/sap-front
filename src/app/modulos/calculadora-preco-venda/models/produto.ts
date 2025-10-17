import Big from 'big.js';
import { RouteLink } from '../../../sap/model/route-link';
import { Action, ActionReturn } from '../../../shared/components/action/action.model';


export class Produto{

  Descricao : string
  UnidadeMedida : string
  KgsPorUnidade : number

  //Custo do sap
  CustoMateriaPrimaCurrency : number

  CustoGgf : number
  ItemCode : string

  Ingredientes : Array<Produto>
  QuantidadeNaReceita : number
  perdasPercentEditable = 0
  caridadeCurrencyEditable = 0
  margemPercentEditable = 0
  despesasCurrencyEditable : number = 0
  financeiroPercentEditable = 0 
  marketingPercentEditable = 0
  tabelaPercentEditable = 0
  creditoTaxaPisCofinsPercentEditable = 0
  debitoTaxaPisCofinsPercentEditable = 0
  qtdPlanejada : number = 1
  DefaultWareHouse : string

  _custoMateriaPrimaEditable : number

  useCustoSap : boolean = true

  get custoMateriaPrimaCurrencyEditable() : number {
    if(this._custoMateriaPrimaEditable == undefined)
      this._custoMateriaPrimaEditable = this.CustoMateriaPrimaCurrency
    
    return this._custoMateriaPrimaEditable
  }
  set custoMateriaPrimaCurrencyEditable(value : number){
    this._custoMateriaPrimaEditable = value
  }

  get TONELADA() : Big {
    return new Big(1000)
  }

  set TONELADA(value) {

  }

  get id() : RouteLink {
    return new RouteLink(
      this.ItemCode,
        null,
        {"id" : this.ItemCode}
      )
  }

  getCusto() : number{
    if(this.useCustoSap)
      return this.CustoMateriaPrimaCurrency
    else
      return this.getCustoReceitaCurrency()
  }

  getSacoTon() : number{
    return this.TONELADA.div(new Big(this.KgsPorUnidade)).toNumber().toFixed(2, Big.roundHalfUp);
  }


  getCustoMateriaTonCurrency() : number{
    return new Big(this.getSacoTon()).times(new Big(this.getCusto())).toNumber()
  }

  getCreditoPisCofinsCurrency() : number{
    return this.getCustoMateriaTonCurrency()*this.creditoTaxaPisCofinsPercentEditable
  }

  getPerdasCurrency() : number{
    return new Big(this.perdasPercentEditable || 0)
      .times(new Big(this.getCustoMateriaTonCurrency()))
      .minus(new Big(this.perdasPercentEditable || 0).times(new Big(this.getCreditoPisCofinsCurrency())))
      .toNumber()
  }

  private _custoGgfTonelada: number | null = null;

  get custoGgfToneladaEditable() : number{
    if(this._custoGgfTonelada !== null && this._custoGgfTonelada !== undefined)
      return this._custoGgfTonelada
    else
      return this.TONELADA.times(this.CustoGgf).toNumber()
  }

  set custoGgfToneladaEditable(valor: number) {this._custoGgfTonelada = Number(valor) || 0;
  }


  debitoPisCofinsCurrency() : number{
    return this.debitoTaxaPisCofinsPercentEditable*this.basePisCofinsCurrency()
  }

  getCustoReceitaCurrency(){
    return this.Ingredientes.reduce((acc,it) => acc+it.getTotalMateriaPrimaCurrency(),0)
  }

  getTotalMateriaPrimaCurrency() : number{
    return new Big(this.QuantidadeNaReceita).times(new Big(this.custoMateriaPrimaCurrencyEditable)).toNumber()
  }

  getTotalMateriaPrimaComPlanejadoCurrency() : number{
    return new Big(this.QuantidadeNaReceita)
      .times(new Big(this.qtdPlanejada))
      .times(new Big(this.custoMateriaPrimaCurrencyEditable)).toNumber()
  }

  getActions(): Action[] {
    return [
        new Action("", new ActionReturn("delete",this), "fas fa-trash")
    ]
  }

  subTotalPisCofinsCompra() : number{
    return this.getCustoMateriaTonCurrency()-this.getCreditoPisCofinsCurrency()
  }

  subTotalPerdas() : number{
    return this.subTotalPisCofinsCompra()+this.getPerdasCurrency()
  }

  subTotalGGF() : number{
    return this.subTotalPerdas()+this.custoGgfToneladaEditable
  }
  
  subTotalCaridade() : number{
    return this.subTotalGGF()+this.caridadeCurrencyEditable
  }

  subTotalDespesas() : number{
    return this.subTotalCaridade()+this.despesasCurrencyEditable
  }

  periodoJuros = 120 //120 dias
  calculoJuros : 'mes' | 'dia' = 'mes'

  getJurosCurrency(){
    return this.getJurosFinanceiro()
  }

  custoComissaoCurrency(){
    return this.custoComissao()
  }

  getJurosFinanceiro(): number {
    const valorBase = new Big(this.subTotalDespesas() ?? 0);
    const taxaDecimal = new Big(this.financeiroPercentEditable ?? 0);
    let taxaDia: Big;
  
    if (this.calculoJuros === 'mes') {
      const base = 1 + Number(taxaDecimal); // usar Number apenas para a raiz fracionária
      const iDiaNum = Math.pow(base, 1 / 30) - 1;
      taxaDia = new Big(iDiaNum < 0 ? 0 : iDiaNum); // proteção mínima contra numéricos ruins
    } else {
      taxaDia = taxaDecimal;
    }
  
    const dias = Math.max(0, Math.trunc(this.periodoJuros || 0)); // expoente inteiro para Big.pow
    if (dias === 0 || taxaDia.eq(0) || valorBase.eq(0)) return 0;
  
    const fator = Big(1).plus(taxaDia).pow(dias);
  
    // montante e juros
    const montante = fator.times(valorBase);
    const jurosApenas = montante.minus(valorBase);
  
    return Number(jurosApenas.toFixed(10));
  }

  subTotalFinanceiro() : number{
    return this.subTotalDespesas()+this.getJurosFinanceiro()
  }

  precoComRepasseCurrency() {
    const c = this.tabelaPercentEditable;
    const t = this.debitoTaxaPisCofinsPercentEditable;
    const m = this.margemPercentEditable;
  
    if (c + t >= 1) throw new Error('Soma de comissão+impostos deve ser < 100%.');
  
    // P = base * (1 + margem) / (1 - (comissao + impostos))
    return this.subTotalFinanceiro() * (1 + m) / (1 - (c + t));
  }

  basePisCofinsCurrency(): number {
    return this.precoComRepasseCurrency()
  }

  custoComissao() : number{
    return this.precoComRepasseCurrency()*this.tabelaPercentEditable
  }

  totalCustos() : number{
    return this.custoComissao()+this.debitoPisCofinsCurrency()
  }

  maregemPorToneladaCurrency(){
    return this.maregemPorTonelada()
  }

  maregemPorTonelada(){
    return this.precoComRepasseCurrency()-this.totalCustos()-this.subTotalFinanceiro()
  }

  getPrecoSacoCurrency() : number{
    return this.precoComRepasseCurrency()/this.getSacoTon()
  }

  mergemLiquidaSacoCurrency() : number{
    return this.maregemPorTonelada()/this.getSacoTon()
  }
}