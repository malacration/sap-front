import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DocumentLines, DocumentList } from '../../../../model/markting/document-list';
import { Column } from '../../../../../shared/components/table/column.model';
import { DocumentService } from '../documento.service';
import { GerarPixComponent } from '../../../../../shared/components/gerar-pix/gerar-pix.component';

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

  @ViewChild('modalPix') modalPix: GerarPixComponent;
  @ViewChild('modalPixTeste') modalPixTeste: GerarPixComponent;

  ngOnInit(): void {
    this.selectedDocumentList.DocumentLines = this.selectedDocumentList.DocumentLines.map(it =>
      Object.assign(new DocumentLines(), it)
    )
  }

  voltar(){
    this.close.emit();
  }

  action(_event: unknown){
  }

  abrirPix() {
    this.modalPix.openModal();
  }

  abrirPixTeste() {
    this.modalPixTeste.openModal();
  }

  definition = [
    new Column('Código do Item', 'ItemCode'),
    new Column('Descrição do Item', 'ItemDescription'),
    new Column('Quantidade do Item', 'quantityCurrency'),
    new Column('Preço Unitário', 'precoUnitarioCurrency'),
    new Column('Total da Linha', 'lineTotalCurrency')
  ];
}
