import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-itens',
  templateUrl: './itens.component.html',
  styleUrls: ['./itens.component.scss'],
})
export class ItensComponent implements OnInit {
  
  itens = new Array<Item>()
  showThumbnail = false

  ngOnInit(): void {
    let item1 = new Item()
    item1.descricao = "Produto 1"
    item1.quantidade = 1
    item1.preco = 50.5
    this.itens.push(item1)
  }



}

export class Item{
  descricao : string
  quantidade : number
  unidade : string
  preco : number
  urlImagem : string
  desconto : number = 0
}