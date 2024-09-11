import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DocumentService } from './documento.service';

@Component({
  selector: 'app-document-core',
  templateUrl: './document-core.component.html',
  styleUrls: ['./document-core.component.scss']
}) export class DocumentCoreComponent implements OnInit, OnChanges{

  loading = false

  @Input()
  service :  DocumentService

  @Input()
  title :  string
  
  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges) {
    
  }

}
