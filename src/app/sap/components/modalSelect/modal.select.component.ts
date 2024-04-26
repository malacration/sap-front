import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { delay, from, of } from 'rxjs';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { Column } from '../../../shared/components/table/column.model';
import { Page } from '../../model/page.model';
import { PaginacaoComponent } from '../paginacao/paginacao.component';




@Component({
  selector: 'app-modal-select',
  templateUrl: './modal.select.component.html',
})
export class ModalSelectComponent implements OnInit {


  @Input()
  name
  @Input()
  definition : Array<Column>;
  @Input()
  loading = false
  @Input()
  resultadoBusca : Page<any> = new Page()
  @Output() 
  changePage = new EventEmitter<number>();
  @Output() 
  search = new EventEmitter<String>();
  
  keyWord = ""
  contentSelected : any = null
  currentPage = 0

  ngOnInit(): void {
  }
    
  @ViewChild('busca', {static: true}) buscaClienteComponent: ModalComponent;
  @ViewChild('paginacao', {static: true}) paginacaoComponent: PaginacaoComponent;

  searchFunction(){
    if(this.paginacaoComponent)
      this.paginacaoComponent.paginaAtual = 0
    this.buscaClienteComponent.openModal()
    this.search.emit(this.keyWord)
  }

  changePageFunction($event){
    this.changePage.emit($event)
  }

  closeModal(){
    this.buscaClienteComponent.closeModal()
  }

  action(action : ActionReturn){
    if(action.type == 'selected'){
      this.contentSelected = action.data
      this.closeModal()
    }
  }

  clear(){
    this.contentSelected = null
  }

  disableSearch(){
    return !this.keyWord || this.keyWord.length < 1
  }
  
  isSelected() : boolean{
    return this.contentSelected ? true : false
  }
}
