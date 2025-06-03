import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { formatCurrency } from '@angular/common';
import { Produto } from '../../models/produto';
import { Column } from '../../../../shared/components/table/column.model';

@Component({
  selector: 'custo-mercadoria',
  templateUrl: './custo-mercadoria.component.html',
})
export class CustoMecadoriaStatementComponent implements OnInit {
  

  @Output()
  voltarEvnt : EventEmitter<void> = new EventEmitter<void>();
  
  qtdPlanejada = 1

  @Input()
  receita : Produto

  optionsReceitas 

  ngOnInit(): void {
    let fatorSubProduto = 40
    console.log(this.receita)
  }

  voltar(){
    this.voltarEvnt.emit()
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
    if (this.receita && !isNaN(value)) {
      this.receita.Ingredientes.forEach(it => it.qtdPlanejada = value);
    } else {
      console.warn('Valor inválido ou receitaSelected não definido');
    }
  }

  resumo(){
    return formatCurrency(this.receita?.Ingredientes?.reduce((acc, it) => acc + it.getTotalMateriaPrimaComPlanejadoCurrency(),0), 'pt', 'R$');
  }

  definition = [
    new Column('ID', 'ItemCode'),
    new Column('Materia Prima', 'Descricao'),
    new Column('Quantidade', 'QuantidadeNaReceita'),
    new Column('Unidade', 'UnidadeMedida'),
    new Column('Custo', 'custoMateriaPrimaCurrencyEditable'),
    new Column('Total', 'getTotalMateriaPrimaComPlanejadoCurrency'),
  ]   
}