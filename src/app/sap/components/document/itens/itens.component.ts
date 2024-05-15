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

  @Output()
  changeItens = new EventEmitter<Array<Item>>();

  ngOnInit(): void {

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
}