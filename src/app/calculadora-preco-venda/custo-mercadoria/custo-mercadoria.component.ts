import { Component, OnInit } from '@angular/core';
import { Column } from '../../shared/components/table/column.model';
import { Option } from '../../sap/model/form/option';
import { formatCurrency } from '@angular/common';

@Component({
  selector: 'custo-mercadoria',
  templateUrl: './custo-mercadoria.component.html',
})
export class CustoMecadoriaStatementComponent implements OnInit {
  
  produto = "OX ACELERA "
  
  qtdPlanejada = 1

  receita1 = new Receita()
  receita2 = new Receita()
  
  receitas = [
    this.receita1,
    this.receita2
  ]

  receitaSelected : Receita
  optionsReceitas 

  ngOnInit(): void {
    this.receita1.descricao = "Base Milho"
    let fatorSubProduto = 40
    
    this.receita1.formula =[
      new ItemReceita("MILHO EM GRAOS", 0.4240 * fatorSubProduto, 0.8851 ,"QUILO"),
      new ItemReceita("DDGS", 0.4500 * fatorSubProduto, 0.7671 ,"QUILO"),
      new ItemReceita("CALCARIO CALCITICO", 0.4240 * fatorSubProduto, 0.4556 ,"QUILO"),
      new ItemReceita("SAL COMUM", 0.03 * fatorSubProduto, 0.4098 ,"QUILO"),
      new ItemReceita("FOSFATO BICALCIO 18%", 0.008 * fatorSubProduto, 3.9206 ,"QUILO"),
      new ItemReceita("UREIA", 0.04 * fatorSubProduto, 2.8794 ,"QUILO"),
      new ItemReceita("PM ACELERA F5", 0.003 * fatorSubProduto, 25.3385 ,"QUILO"),
      new ItemReceita("GGF", 0.003 * fatorSubProduto, 0.1082 ,"QUILO"),
      new ItemReceita("SACARIA POWER", 1, 1.7069,"UNID"),
    ]

    this.receita2.descricao = "Base Soja"
    this.receita2.formula =[
      new ItemReceita("SOJA EM GRAOS", 0.4240 * fatorSubProduto, 1.0 ,"QUILO"),
      new ItemReceita("DDGS", 0.4500 * fatorSubProduto, 0.7671 ,"QUILO"),
      new ItemReceita("CALCARIO CALCITICO", 0.0460 * fatorSubProduto, 0.4556 ,"QUILO"),
      new ItemReceita("SAL COMUM", 0.03 * fatorSubProduto, 0.4098 ,"QUILO"),
      new ItemReceita("FOSFATO BICALCIO 18%", 0.008 * fatorSubProduto, 3.9206 ,"QUILO"),
      new ItemReceita("UREIA", 0.04 * fatorSubProduto, 2.8794 ,"QUILO"),
      new ItemReceita("PM ACELERA F5", 0.003 * fatorSubProduto, 25.3385 ,"QUILO"),
      new ItemReceita("GGF", 0.003 * fatorSubProduto, 0.1082 ,"QUILO"),
      new ItemReceita("SACARIA POWER", 1, 1.7069,"UNID"),
    ]
    this.optionsReceitas = this.receitas.map(it => new Option(it,it.descricao))
        
  }
  
  changeQtdPlanejuada($event){
    let value: number;
    if ($event && $event.target && $event.target.value) {
      value = +$event.target.value;
    } else if (typeof $event === 'number') {
      value = $event;
    } else {
      console.warn('Valor inválido recebido:', $event);
      return;
    }
    if (this.receitaSelected && !isNaN(value)) {
      this.receitaSelected.formula.forEach(it => it.qtdPlanejada = value);
    } else {
      console.warn('Valor inválido ou receitaSelected não definido');
    }
  }

  selectReceita($event){
    this.receitaSelected = $event
    this.changeQtdPlanejuada(this.qtdPlanejada)
  }

  resumo(){
    return formatCurrency(this.receitaSelected?.formula?.reduce((acc, it) => acc + it.totalCurrency(),0), 'pt', 'R$');
  }

  definition = [
    new Column('Materia Prima', 'descricao'),
    new Column('Quantidade', 'quantidadeMutiplicado'),
    new Column('Unidade', 'unidadeMedida'),
    new Column('Custo', 'custoUnitarioEditable'),
    new Column('Total', 'totalCurrency'),
  ]   

  action($event){
    alert("windson")
  }

}

export class Receita{
  descricao
  qtdMinima = 40   
  unidadeMedida = "SC/40"
  unidadeKg = 40
  formula : Array<ItemReceita>

  indexFormulaSelecionada : number = undefined

  getFormulaSelecionada() : ItemReceita{
    if(this.indexFormulaSelecionada)
      return this.formula[this.indexFormulaSelecionada]
    else
      return this.formula[0]
  }

  // getDescricao() : string{
  //   return this.getFormulaSelecionada().descricao
  // }

  // proporcao() : string{
  //   return this.getFormulaSelecionada().quantidade
  // }

  // custoUnitario() : string{
  //   return this.getFormulaSelecionada().custoUnitario
  // }
}

export class ItemReceita{
  descricao : string
  quantidade : number
  custoUnitarioCurrency : number
  unidadeMedida : string
  qtdPlanejada : number = 1


  private _custoUnitarioEditable

  get custoUnitarioEditable() : any {
    if(!this._custoUnitarioEditable){
      this._custoUnitarioEditable = this.custoUnitarioCurrency.toString()
      this.custoUnitarioEditableBlur()
    }
    return this._custoUnitarioEditable
  }

  set custoUnitarioEditable(value : any) {
    this._custoUnitarioEditable = value
  }

  custoUnitarioEditableBlur(){
    this.custoUnitarioCurrency = this._custoUnitarioEditable.replace(",",".").replace("R$","")
    this._custoUnitarioEditable =  formatCurrency(this.custoUnitarioCurrency, 'pt', 'R$',null,`1.${4}`);
  }

  constructor(
    descricao : string,
    quantidade : number,
    custoUnitario : number,
    unidadeMedida : string
  ){
    this.descricao = descricao
    this.quantidade = quantidade
    this.custoUnitarioCurrency = custoUnitario
    this.unidadeMedida = unidadeMedida
  }

  totalCurrency() : number{
    return this.quantidadeMutiplicado()*this.custoUnitarioCurrency
  }

  quantidadeMutiplicado() : number{
    return this.quantidade*this.qtdPlanejada
  }
}