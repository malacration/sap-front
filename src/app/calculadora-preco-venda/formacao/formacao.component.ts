import { Component, OnInit } from '@angular/core';
import { Column } from '../../shared/components/table/column.model';

@Component({
  selector: 'formacao-preco',
  templateUrl: './formacao.component.html',
})
export class FormacaoPrecoStatementComponent implements OnInit {
  
  produto = "OX ACELERA "

  produtos
  
  qtdPlanejada = 1

  ngOnInit(): void {
    let p1 = new Produto(
      "OX SUSTEN BABY",
      "SACO 30KG",
      30,
      72.33,
      0.1082)

    let p2 = new Produto(
      "OX LEITE",
      "SACO 40KG",
      40,
      92.33,
      0.1082)

    this.produtos = [
      p1,
      p2
    ]
    let fatorSubProduto = 40
            
  }

  definition = [
    new Column('Produtos', 'descricao',null,true),
    
    new Column('Sacaria', 'unidadeMedida'),
    
    new Column('Custo Saco', 'custoMateriaPrimaCurrency'),
    new Column('Qtd Saco/ton', 'getSacoTon'),
    new Column('Custo por ton', 'getCustoMateriaTonCurrency'),

    new Column('(%) PIS/COFINS', 'creditoTaxaPisCofinsEditable'),
    new Column('(-) PIS/COFINS', 'getCreditoPisCofinsCurrency'),

    new Column('(%) Perdas', 'perdasEditable'),
    new Column('Perdas', 'getPerdasCurrency'),

    new Column('GGF/TON', 'getCustoGgfToneladaCurrency'),

    new Column('(R$) Filantropia/ton', 'caridadeEditable'),
    new Column('(R$) Premiação/ton', 'premiacaoEditable'),

    new Column('(%) Margem', 'margemEditable'),

    new Column('Margem', 'getMargemCurrency'),

    // new Column('Premiacao', 'premiacaoEditable'),

    // new Column('Financeiro', 'financeiroEditable'),

    // new Column('Marketing', 'marketingEditable'),
    
    new Column('(%) PIS/COFINS', 'debitoTaxaPisCofinsEditable'),
    new Column('PIS/COFINS', 'debitoPisCofinsCurrency'),
    new Column('credito-debito', 'getLiquidoPisCofins'),

    new Column('R$/ton', 'getPrecoTon'),
    new Column('R$/SC', 'getPrecoSaco'),
  ]   

  action($event){
    alert("windson")
  }

}

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

  constructor(
    descricao : string, 
    unidadeMedida : string,
    kgsPorUnidade : number,
    custoMateriaPrimaCurrency : number,
    custoGgf : number){
    
    this.descricao = descricao
    this.unidadeMedida = unidadeMedida
    this.kgsPorUnidade = kgsPorUnidade
    this.custoMateriaPrimaCurrency = custoMateriaPrimaCurrency
    this.custoGgf = custoGgf
  }

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


