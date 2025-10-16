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
  premiacaoCurrencyEditable : number = 0
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

  custoGgfTonelada = null

  get custoGgfToneladaEditable() : number{
    if(this.custoGgfTonelada)
      return this.custoGgfTonelada
    else
      return this.TONELADA.times(this.CustoGgf).toNumber()
    
  }

  set custoGgfToneladaEditable(valor : number){
    this.custoGgfTonelada = valor
  }


  getMargemCurrency() : number{
    console.log(this.margemPercentEditable,"margemPercentEditable")
    console.log(this.getCustoMateriaTonCurrency(),"getCustoMateriaTonCurrency")
    console.log(this.custoGgfToneladaEditable,"custoGgfToneladaEditable")
    console.log(this.getPerdasCurrency(),"getPerdasCurrency")
    return this.margemPercentEditable*(
      this.getCustoMateriaTonCurrency()+
      this.custoGgfToneladaEditable+
      this.getPerdasCurrency()
    )
  }

  basePisCofinsCurrency(): number {
    const debitoPct = Number(this.debitoTaxaPisCofinsPercentEditable ?? 0);
  
    const creditoPisCofins =
      debitoPct > 0 ? Number(this.getCreditoPisCofinsCurrency?.() ?? 0) : 0;

      const multiplicador =
      (1 + Number(this.financeiroPercentEditable ?? 0)) *
      (1 + Number(this.marketingPercentEditable ?? 0)) *
      (1 + Number(this.tabelaPercentEditable ?? 0));
  
    const margem = Number(this.getMargemCurrency?.() ?? 0);
    const custo  = Number(this.getCustoMateriaTonCurrency?.() ?? 0);
  
    const caridade  = Number(this.caridadeCurrencyEditable ?? 0);
    const ggf       = Number(this.custoGgfToneladaEditable ?? 0);
    const premiacao = Number(this.premiacaoCurrencyEditable ?? 0);
  
    const base =
      (margem + custo) * multiplicador +
      caridade + ggf + premiacao -
      creditoPisCofins;
  
    return base * (1 - debitoPct);
  }

  debitoPisCofinsCurrency() : number{
    return this.debitoTaxaPisCofinsPercentEditable*this.basePisCofinsCurrency()
  }

  getPrecoTonCurrency() : number{
    return this.basePisCofinsCurrency()
  }

  getPrecoSacoCurrency(){
    return this.getPrecoTonCurrency()/this.getSacoTon()
  }

  getCustoReceitaCurrency(){
    return this.Ingredientes.reduce((acc,it) => acc+it.getTotalMateriaPrimaCurrency(),0)
  }

  getLiquidoPisCofinsCurrency(){
    return this.getCreditoPisCofinsCurrency()-this.debitoPisCofinsCurrency()
  }

  getTotalMateriaPrimaCurrency() : number{
    return new Big(this.QuantidadeNaReceita).times(new Big(this.custoMateriaPrimaCurrencyEditable)).toNumber()
  }

  getTotalMateriaPrimaComPlanejadoCurrency() : number{
    return new Big(this.QuantidadeNaReceita)
      .times(new Big(this.qtdPlanejada))
      .times(new Big(this.custoMateriaPrimaCurrencyEditable)).toNumber()
  }

  getResultadoCurrency() : number {
    return (this.getPrecoTonCurrency()-
      (-this.getLiquidoPisCofinsCurrency())-
      this.custoGgfToneladaEditable-
      this.getCustoMateriaTonCurrency())
  }

  getActions(): Action[] {
    return [
        new Action("", new ActionReturn("delete",this), "fas fa-trash")
    ]
  }
}