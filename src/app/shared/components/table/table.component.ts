import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import * as Handlebars from 'handlebars';
import { Column } from './column.model';
import { RouteLink } from '../../../sap/model/route-link';
import { formatCurrency } from '@angular/common';
import { FormControl } from '@angular/forms';


@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {

  @Input()
  content : Array<any> = new Array()

  @Input()
  definition : Array<Column> = new Array()

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
    if(document.getElementById('tableCard')){
      // Get the table container width:
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
  }

  renderContent(item : any, definition : Column){
    if (this.isEditable(definition) || this.isRouterLink(item, definition)) {
      return undefined
    }
    
    const value = this.getValue(item,definition)

    if(definition.html){
      return Handlebars.compile(definition.html)({ 'value' : value})
    }else if (definition.property.endsWith("Currency") && typeof value === 'number') {
      return formatCurrency(value, 'pt', 'R$');
    }
    return value
  }

  isRouterLink(item : any, definition : Column) : boolean{
    return this.getValue(item,definition) instanceof RouteLink
  }

  isEditable(definition : Column){
    return definition.property.endsWith("Editable")
  }

  getValue(item : any, definition : Column) : any{
    return typeof item[definition.property] === 'function' ? item[definition.property]() : item[definition.property]
  }

  
  formControlFactory(item : any, definition : Column) : FormControl{
    let formControl = new FormControl(this.getValue(item,definition))
    formControl.valueChanges.subscribe(value => {
      this.processInputChange(item,definition,value);
    });

    return formControl
  }

  onInputBlur(item : any, definition : Column){
    if(item[definition.property+"Blur"])
      item[definition.property+"Blur"]()
  }

  processInputChange(item : any, definition : Column, value: string): void {
    typeof item[definition.property] === 'function' ? item[definition.property](value) : item[definition.property] = value
  }
  
  evento(retorno : any){
    this.actionOutput.emit(retorno)
  }

  hasAction() : Boolean{
    return this.content instanceof Array && this?.content?.filter(item => item.getActions).length > 0
  }

  trackByFn(index, response) {
    return index;
  }

}
