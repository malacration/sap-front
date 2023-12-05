import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  definition : Array<Column>

  @Output()
  actionOutput : EventEmitter<any> = new EventEmitter<any>()

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

  evento(retorno : any){
    this.actionOutput.emit(retorno)
  }

}