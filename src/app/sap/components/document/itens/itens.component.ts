import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Item } from '../../../model/item';

@Component({
  selector: 'card-itens',
  templateUrl: './itens.component.html',
  styleUrls: ['./itens.component.scss'],
})
export class ItensComponent implements OnInit {
  
  itens = new Array<Item>()
  showThumbnail = false
  
  @Input()
  branchId = undefined

  @Input()
  geralLoading = false

  @Input()
  title = "Produtos"

  @Output()
  changeItens = new EventEmitter<Array<Item>>();

  ngOnInit(): void {

  }

  total() : number{
    return this.itens.reduce((acc, it) => acc+it.unitPriceLiquid()*it.quantidade,0)
  }

  addItem(item){
    item.quantidade = 1
    this.itens.push(item)
    this.changeItens.emit(this.itens)
  }

  remover(item){
    var index = this.itens.indexOf(item);
    if (index !== -1) {
      this.itens.splice(index, 1);
      this.changeItens.emit(this.itens)
    }
  }

  arredondarParaTroco(){
    this.aplicarDescontoCentavos()
  }

  //Esse metodo gera valores totalmente inconsistentes, nao acredito que seria adequado
  aplicarDescontoCentavos() {
    // 1. Extrair centavos do total
    const centavos = Math.round((this.total() * 100) % 100);

    // 2. Achar o item com menor valor total
    const itemMaisBarato = this.itens.reduce((menor, atual) => {
      return atual.totalSemFormatacao() < menor.totalSemFormatacao() ? atual : menor;
    });
  
    // 3. Calcular o desconto percentual necessário
    const descontoPercentual = parseFloat(((centavos / itemMaisBarato.unitPriceLiquid())).toFixed(4));

    if(descontoPercentual > 0)
      itemMaisBarato.descontoVendedorPorcentagem = itemMaisBarato.descontoVendedorPorcentagem+descontoPercentual
    // 4. Aplicar o desconto ao item escolhido
    alert(descontoPercentual)
  }
  
}