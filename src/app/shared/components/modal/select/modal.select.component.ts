import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ModalComponent } from '../../modal/modal.component';
import { ActionReturn } from '../../action/action.model';
import { Column } from '../../table/column.model';
import { PaginacaoComponent } from '../../../../sap/components/paginacao/paginacao.component';
import { Page } from '../../../../sap/model/page.model';




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

  @Output() 
  contentSelected = new EventEmitter<any>();
  
  keyWord = ""
  content : any = null
  currentPage = 0

  ngOnInit(): void {
    this.buscaModal.classeModal = "modal-xl"
  }
    
  @ViewChild('busca', {static: true}) buscaModal: ModalComponent;
  @ViewChild('paginacao', {static: true}) paginacaoComponent: PaginacaoComponent;

  searchFunction(){
    if(this.paginacaoComponent)
      this.paginacaoComponent.paginaAtual = 0
    this.buscaModal.openModal()
    this.search.emit(this.keyWord)
  }

  changePageFunction($event){
    this.changePage.emit($event)
  }

  closeModal(){
    this.buscaModal.closeModal()
  }

  action(action : ActionReturn){
    if(action.type == 'selected'){
      this.content = action.data
      this.closeModal()
      this.contentSelected.emit(this.content)
    }
  }

  clear(){
    this.content = null
  }

  disableSearch(){
    return !this.keyWord || this.keyWord.length < 1
  }
  
  isSelected() : boolean{
    return this.content ? true : false
  }
}
