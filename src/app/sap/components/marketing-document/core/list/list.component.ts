import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { DocumentList } from '../../../../model/markting/document-list';
import { ActionReturn } from '../../../../../shared/components/action/action.model';
import { Page } from '../../../../model/page.model';
import { DocumentService } from '../documento.service';
import { AuthService } from '../../../../../shared/service/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-marketing-document-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
}) export class ListComponent implements OnInit, OnChanges, OnDestroy{

  loading : boolean = false
  pageContent : Page<DocumentList>
  nomeUsuario : string
  selectedDocumentList: DocumentList = null;
  private routeSubscription: Subscription;
  private routeDocEntry: number = null;
  
  @Input()
  title = ''

  @Input()
  showCard = true

  @Input()
  mapaRelacoesTipo : string = null

  constructor(private auth : AuthService, private route: ActivatedRoute){
    this.nomeUsuario = auth.getUser()
  }

  definition = [
  ]

  @Input()
  service :  DocumentService

  
  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.subscribe((params) => {
      this.routeDocEntry = params['id'] ? Number(params['id']) : null;
      this.selecionaDocumentoDaRota();
    });
  }

  action(event: ActionReturn) {
    if(event.type == "selectedDocumentList"){
      this.selectedDocumentList = event.data;
    }
  }
  
  close() {
    this.selectedDocumentList = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['service']) {
      this.loading = true;
      this.service.get(0).subscribe({
        next : (it: Page<DocumentList>) => {
          this.pageContent = it
          this.selecionaDocumentoDaRota()
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
        this.selecionaDocumentoDaRota()
      },
      complete : () => {this.loading = false}
    })
  }

  carregarMais() {
    if (!this.pageContent?.nextLink || !this.service.getNextLink) return;
    this.loading = true;
    this.service.getNextLink(this.pageContent.nextLink).subscribe({
      next: (it: Page<DocumentList>) => {
        it.content = [...this.pageContent.content, ...it.content];
        this.pageContent = it;
      },
      complete: () => { this.loading = false; }
    });
  }

  reload() {
    this.loading = true;
    this.service.get(0).subscribe({
      next: (it: Page<DocumentList>) => { this.pageContent = it; },
      complete: () => { this.loading = false; }
    });
  }

  private selecionaDocumentoDaRota() {
    if (!this.routeDocEntry || !this.service) return;

    const documento = this.pageContent?.content?.find((item) => Number(item.DocEntry) === this.routeDocEntry);
    if (documento) {
      this.selectedDocumentList = documento;
      return;
    }

    if (!this.service.getById) return;

    this.loading = true;
    this.service.getById(this.routeDocEntry).subscribe({
      next: (item) => { this.selectedDocumentList = item; },
      complete: () => { this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

}
