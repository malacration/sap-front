import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ListComponent } from '../marketing-document/core/list/list.component';
import { DocumentService } from '../marketing-document/core/documento.service';
import { SapDocumentKind, SAP_DOCUMENT_CONFIGS, SapDocumentServiceFactory } from '../../service/document/sap-document.service';

@Component({
  selector: 'app-documentos-sap',
  templateUrl: './documentos-sap.component.html',
})
export class DocumentosSapComponent implements OnInit {

  @ViewChild('lista') lista: ListComponent;

  title = ''
  service: DocumentService
  mapaRelacoesTipo: string = null

  constructor(private route: ActivatedRoute,
              private factory: SapDocumentServiceFactory) {
  }

  ngOnInit(): void {
    const kind = this.resolveKind();
    const config = SAP_DOCUMENT_CONFIGS[kind];
    this.title = config.title;
    this.service = this.factory.create(kind);
    this.mapaRelacoesTipo = kind === 'recebimento' ? null : kind;
  }

  private resolveKind(): SapDocumentKind {
    const data = this.route.snapshot.data as any;
    if(data['sapDocumentKind'])
      return data['sapDocumentKind'] as SapDocumentKind;

    const metadata = Array.isArray(data) ? data : Object.values(data) as Array<string>;
    const marker = metadata?.find((item) => item.startsWith('sapDocumentKind:'));
    return (marker?.split(':')[1] || 'nota-fiscal') as SapDocumentKind;
  }
}
