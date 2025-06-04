import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ModalComponent } from '../../modal/modal.component';
import { ActionReturn } from '../../action/action.model';
import { Column } from '../../table/column.model';
import { PaginacaoComponent } from '../../paginacao/paginacao.component';
import { Page } from '../../../../sap/model/page.model';

@Component({
  selector: 'app-resultado-search',
  templateUrl: './resultado-search.component.html',
})
export class ResultadoSearchComponent {
  
  constructor(){}
  
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
  
<<<<<<< HEAD
    action(action : ActionReturn){
      this.actionOutput.emit(action)
=======
	  action(action : ActionReturn){
      if(action.type == 'selected'){
        this.content = action.data
        this.contentSelected.emit(this.content)
      }
>>>>>>> 79c7942c5db2ecc0cfbd0ef958e559e5e706f26b
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

