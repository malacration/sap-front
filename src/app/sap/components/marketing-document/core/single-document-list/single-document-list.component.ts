import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DocumentLines, DocumentList } from '../../../../model/markting/document-list';
import { Column } from '../../../../../shared/components/table/column.model';
import { DocumentService } from '../documento.service';

@Component({
  selector: 'app-document-list-single',
  templateUrl: './single-document-list.component.html',
  styleUrls: ['./single-document-list.component.scss']
})
export class DocumentListSingleComponent implements OnInit {

  @Input()
  title: string;

  @Input()
  service: DocumentService;

  @Input() 
  selectedDocumentList: DocumentList = null;

  @Output()
  close = new EventEmitter();

  ngOnInit(): void {
    this.selectedDocumentList.DocumentLines = this.selectedDocumentList.DocumentLines.map(it =>
      Object.assign(new DocumentLines(), it)
    )
  }

  voltar(){
    this.close.emit();
  }

  action($event){
    // Implement your action logic here
  }

  definition = [
    new Column('Código do Item', 'ItemCode'),
    new Column('Descrição do Item', 'ItemDescription'),
    new Column('Quantidade do Item', 'quantityCurrency'),
    new Column('Preço Unitário', 'precoUnitarioCurrency'),
    new Column('Total da Linha', 'lineTotalCurrency')
  ];
}
