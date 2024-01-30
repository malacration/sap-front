import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
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

  tableColumns : any

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.tableColumns = this.definition.map(it => it.label);
    this.calculateTableWidth();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.calculateTableWidth();
  }

  calculateTableWidth() {
    // Get the table container width:
    console.log(document.getElementById('tableCard'))
    const pageWidth = document.getElementById('tableCard').offsetWidth;
    // Get the longest column name
    const longest = this.tableColumns.sort(function (a, b) { return b.length - a.length; })[0];
    // Calculate table width
    let tableWidth = this.tableColumns.length * longest.length * 10;
    // If the width is less than the pageWidth
    if (tableWidth < (pageWidth - 10)) {
      // We set tableWidth to pageWidth - scrollbarWidth (10 in my project)
      tableWidth = pageWidth - 10;
    }
    // Then we update the --table-width variable:
    document.querySelector('body').style.cssText = '--table-width: ' + tableWidth + 'px';
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