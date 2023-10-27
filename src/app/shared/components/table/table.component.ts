import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { FaturaDefinition } from '../../../sap/model/fatura/fatura.model';
import * as Handlebars from 'handlebars';
import { Column } from './column.model';

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

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    
  }

  renderContent(item : any, definition : Column){
    let value = item[definition.property]
    if(definition.html){
      return Handlebars.compile(definition.html)({ 'value' : value})
    }
    return value
  }
}