import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DocumentList } from '../../../../model/markting/document-list';
import { ActionReturn } from '../../../../../shared/components/action/action.model';
import { Page } from '../../../../model/page.model';
import { DocumentService } from '../documento.service';
import { AuthService } from '../../../../../shared/service/auth.service';

@Component({
  selector: 'app-marketing-document-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
}) export class ListComponent implements OnInit, OnChanges{

  loading : boolean = false
  pageContent : Page<DocumentList>
  nomeUsuario : string
  
  @Input()
  title = ''

  constructor(private auth : AuthService){
    this.nomeUsuario = auth.getUser()
  }

  definition = [
  ]

  @Input()
  service :  DocumentService

  
  ngOnInit(): void {

  }

  action(event : ActionReturn){
    if(event.type == "ver-fatura"){
      
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['service']) {
      this.loading = true;
      this.service.get(0).subscribe({
        next : (it: Page<DocumentList>) => {
          this.pageContent = it
        },
        complete : () => {this.loading = false}
      })
      this.definition = this.service.getDefinition()
    }
  }

  pageChange($event){
    this.loading = true
    this.service.get($event).subscribe({
      next : (it: Page<DocumentList>) => {
        this.pageContent = it
      },
      complete : () => {this.loading = false}
    })
  }

}
