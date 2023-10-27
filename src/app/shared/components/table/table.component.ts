import { Component, Input, OnInit } from '@angular/core';
import { FaturaDefinition } from '../../../sap/model/fatura/fatura.model';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {

  @Input()
  content : Array<any>

  @Input()
  definition : Array<Column> = new FaturaDefinition().getFaturaDefinition()

  constructor() {}

  ngOnInit(): void {
    
  }

  renderContent(item : any, definition : Column){
    let value = item[definition.property]
    if(definition.html){
      return definition.html
    }
    return value
  }
}

export class Column{
  label : string
  property : string
  html : string = null

  constructor(label : string, property : string, html : string = null){
    this.label = label
    this.property = property
    this.html = html
  }
}
