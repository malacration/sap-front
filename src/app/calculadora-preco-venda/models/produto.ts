import { RouterLink } from '@angular/router';
import Big from 'big.js';
import { RouteLink } from '../../sap/model/route-link';
import { Action, ActionReturn } from '../../shared/components/action/action.model';


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
    console.log(this.KgsPorUnidade, this.ItemCode+" ")
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

  getCustoGgfToneladaCurrency() : number{
    return this.TONELADA.times(this.CustoGgf).toNumber()
  }

  getMargemCurrency() : number{
    return this.margemPercentEditable*(
      this.getCustoMateriaTonCurrency()+
      this.getCustoGgfToneladaCurrency()+
      this.getPerdasCurrency()
    )
  }

  basePisCofinsCurrency() : number{
    let creditoPisConfins = this.debitoTaxaPisCofinsPercentEditable > 0 ? this.getCreditoPisCofinsCurrency() : 0
    let mutiplicador = (1+this.financeiroPercentEditable)*(1+this.marketingPercentEditable)*(1+this.tabelaPercentEditable)
    return (
      ((this.getMargemCurrency()+this.getCustoMateriaTonCurrency())*mutiplicador)+
      this.caridadeCurrencyEditable+
      this.getCustoGgfToneladaCurrency()+
      this.premiacaoCurrencyEditable
      -creditoPisConfins
      )/(1-this.debitoTaxaPisCofinsPercentEditable);
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
      this.getCustoGgfToneladaCurrency()-
      this.getCustoMateriaTonCurrency())
  }

  getActions(): Action[] {
    return [
        new Action("", new ActionReturn("delete",this), "fas fa-trash")
    ]
  }
}