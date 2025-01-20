export class Produto{

    descricao : string
    unidadeMedida : string
    kgsPorUnidade : number
    custoMateriaPrimaCurrency : number
    custoGgf : number
  
    perdasEditable = 0
    caridadeEditable = 0
    margemEditable = 0
    premiacaoEditable : number = 0
    financeiroEditable = 0 
    marketingEditable = 0
    creditoTaxaPisCofinsEditable = 0
    debitoTaxaPisCofinsEditable = 0
  
    TONELADA = 1000
    
    getSacoTon() : number{
      return this.TONELADA/this.kgsPorUnidade
    }
  
  
    getCustoMateriaTonCurrency(){
      return (this.TONELADA/this.getSacoTon())*this.custoMateriaPrimaCurrency
    }
  
    getCreditoPisCofinsCurrency() : number{
      return this.getCustoMateriaTonCurrency()*this.creditoTaxaPisCofinsEditable
    }
  
    getPerdasCurrency(){
      return this.perdasEditable*this.getCustoMateriaTonCurrency()
    }
  
    getCustoGgfToneladaCurrency(){
      return this.custoGgf*this.getSacoTon()
    }
  
    getMargemCurrency(){
      return this.margemEditable*this.getCustoMateriaTonCurrency()
    }
  
    basePisCofins() : number{
      return (this.getMargemCurrency()+
      this.caridadeEditable+
      this.getCustoGgfToneladaCurrency()+
      this.getPerdasCurrency()+
      this.premiacaoEditable+
      this.getCustoMateriaTonCurrency());
    }
  
    debitoPisCofinsCurrency() : number{
      return (this.debitoTaxaPisCofinsEditable*this.basePisCofins())-this.getCreditoPisCofinsCurrency()
    }
  
    getPrecoTon(){
      return this.basePisCofins()+this.debitoPisCofinsCurrency()
    }
  
    getPrecoSaco(){
      return this.getPrecoTon()/this.getSacoTon()
    }
  
  }