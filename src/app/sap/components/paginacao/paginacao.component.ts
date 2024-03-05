import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';

@Component({
  selector: 'app-paginacao',
  templateUrl: './paginacao.component.html',
  styleUrls: ['./paginacao.component.scss']
})
export class PaginacaoComponent implements OnInit {
  
  @Output() 
  pageChange = new EventEmitter<number>();
  
  paginaAtual : number = 0

  @Input()
  pageSize : number = 10

  @Input()
  totalItens : number = 20

  totalVisiblePages = 10;


  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.totalMaxPage(window.innerWidth)
  }

  constructor(private route: ActivatedRoute){
    
  }

  ngOnInit() {
    this.totalMaxPage(window.innerWidth)
  }


  totalMaxPage(size){
    let tamanhoPorIndex = 30
    let botaoFixo = 150
    this.totalVisiblePages = Math.trunc((size-botaoFixo)/tamanhoPorIndex)
    if(this.totalVisiblePages > 10 || this.paginaAtual+(this.totalVisiblePages/2) > 9)
      this.totalVisiblePages = Math.trunc((size-botaoFixo)/(tamanhoPorIndex*1.30))
  }

  change(number) {
    this.paginaAtual = number
    this.pageChange.emit(number)
    this.totalMaxPage(window.innerWidth)
  }

  isFirst() : boolean{
    return this.paginaAtual == 0
  }

  isLast() : boolean{
    return this.paginaAtual == this.totalPages-1
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
    let startPage = Math.max(0, this.paginaAtual - Math.floor(this.totalVisiblePages / 2));
    let endPage = startPage + this.totalVisiblePages - 1;
    if (endPage > this.totalPages) {
      endPage = this.totalPages-1;
      startPage = Math.max(0, endPage - this.totalVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      visiblePages.push(i);
    }
    return visiblePages;
  }

  

}
