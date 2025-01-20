import { Component, Input, OnInit } from '@angular/core';
import { Column } from '../../../shared/components/table/column.model';
import { Produto } from '../../models/produto';

@Component({
  selector: 'formacao-preco',
  templateUrl: './formacao.component.html',
})
export class FormacaoPrecoStatementComponent implements OnInit {
  
  produto = "OX ACELERA "

  @Input()
  produtos : Array<Produto> = new Array<Produto>()
  
  qtdPlanejada = 1

  ngOnInit(): void {
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

