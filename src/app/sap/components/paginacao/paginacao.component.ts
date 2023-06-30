import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';

@Component({
  selector: 'app-paginacao',
  templateUrl: './paginacao.component.html',
  styleUrls: ['./paginacao.component.scss']
})
export class PaginacaoComponent {
  
  @Output() 
  pageChange = new EventEmitter<number>();
  
  paginaAtual : number = 0

  @Input()
  pageSize : number = 10

  @Input()
  totalItens : number = 20


  constructor(private route: ActivatedRoute){
  }

  change(number) {
    this.paginaAtual = number
    this.pageChange.emit(number)
  }

  isFirst() : boolean{
    return this.paginaAtual == 0
  }

  isLast() : boolean{
    return this.paginaAtual == this.totalPages
  }

  first() : String {
      return this.isFirst() ? "disabled" : ""
  }

  last() : String {
    return this.isLast() ? "disabled" : ""
  }

  active(number) : String{
    return number==this.paginaAtual ? "active" : ""
  }


  anterior(){
    if(!this.isFirst()){
      this.change(this.paginaAtual-1)
    }
  }

  proximo(){
    if(!this.last()){
      this.change(this.paginaAtual+1)
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItens / this.pageSize);
  }

  get pages(): number[] {
    const visiblePages: number[] = [];
    const totalVisiblePages = 10;
    let startPage = Math.max(0, this.paginaAtual - Math.floor(totalVisiblePages / 2));
    let endPage = startPage + totalVisiblePages - 1;
    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(0, endPage - totalVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }
    return visiblePages;
  }

  

}
