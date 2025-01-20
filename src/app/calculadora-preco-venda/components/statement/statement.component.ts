import { Component, OnInit } from '@angular/core';
import { Analise } from '../../models/analise';

@Component({
  selector: 'statement-calc',
  templateUrl: './statement.component.html',
})
export class CalculadoraStatementComponent implements OnInit {
  

  analiseSelected : Analise = null

  ngOnInit(): void {

  }

  criarAnalise(){
    this.analiseSelected = new Analise()
  }

  isSelectProduto(){
    return this.analiseSelected?.produtos.length == 0
  }

  selecaoProdutos($event){
    this.analiseSelected.produtos = $event
  }

}


