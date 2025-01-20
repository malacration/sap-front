import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Produto } from '../../models/produto';
import { teste } from '../../service/teste';

@Component({
  selector: 'selecao-produto-calc',
  templateUrl: './selecao-produto.component.html',
})
export class SelecaoProdutoComponent implements OnInit {
  

  constructor(private service : teste){

  }

  @Output()
  selecaoProdutos : EventEmitter<Array<Produto>> = new EventEmitter<Array<Produto>>();

  ngOnInit(): void {

  }

  selecionaTodosProdutos(){
    this.service.range().subscribe(it => {
      console.log(it)
      this.selecaoProdutos.emit(it)
    })
  }

}


