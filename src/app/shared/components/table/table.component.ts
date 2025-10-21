import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import * as Handlebars from 'handlebars';
import { Column } from './column.model';
import { RouteLink } from '../../../sap/model/route-link';
import { formatCurrency } from '@angular/common';
import { FormControl } from '@angular/forms';
import { AlertService } from '../../../sap/service/alert.service';


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


  @Input()
  editableDynamic : boolean = false

  @Output()
  actionOutput : EventEmitter<any> = new EventEmitter<any>()

  formControlList : Map<String,FormControl> = new Map()

  tableColumns : any



  constructor(private elementRef: ElementRef, private alertService: AlertService,
    private cdr: ChangeDetectorRef) {}

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
    }
  }

  renderContent(item : any, definition : Column){
    if (this.isEditable(definition) || this.isRouterLink(item, definition)) {
      return undefined
    }
    
    const value = this.getValue(item,definition)

    if(definition.html){
      return Handlebars.compile(definition.html)({ 'value' : value})
    }else if (definition.property.endsWith("Currency") && (typeof value == 'number')) {
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

  isPercent(definition : Column) : boolean{
    return definition.property.endsWith("PercentEditable")
  }

  isCurrency(definition : Column) : boolean{
    return definition.property.endsWith("CurrencyEditable")
  }

  isNormalEditable(def) : boolean{
    return !this.isPercent(def) && !this.isCurrency(def)
  }

  getValue(item : any, definition : Column) : any{
    return typeof item[definition.property] === 'function' ? item[definition.property]() : item[definition.property]
  }

  getInputSize(item: any, def: any): number {
    if(!this.editableDynamic)
      return null
    const value = this.formControlFactory(item, def).value?.toString() || "";
    return Math.max(value.length, 4)+2; // Pelo menos 4 caracteres
  }

  
  formControlFactory(item : any, definition : Column) : FormControl{
    let key = "formControlFactory"+definition.property
    if(item[key] == null || item[key] == undefined) {
      item[key] = new FormControl(this.getValue(item,definition))
      item[key].valueChanges.subscribe(value => {
        this.processInputChange(item,definition,value);
      });
    }
    return item[key]
  }

  onInputBlur(item : any, definition : Column){
    if(item[definition.property+"Blur"])
      item[definition.property+"Blur"]()
  }

  processInputChange(item: any, definition: Column, value: any): void {
    const newVal = this.coerceValueForColumn(definition, value);
    
    if (typeof item[definition.property] === 'function') {
      item[definition.property](newVal);
    } else {
      item[definition.property] = newVal;
    }
    const key = 'formControlFactory' + definition.property;
    const fc = item[key] as FormControl | undefined;
    if (fc) {
      const viewValue = this.getValue(item, definition);
      if (fc.value !== viewValue) {
        fc.setValue(viewValue, { emitEvent: true });
      }
    }
    this.cdr.markForCheck();
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

  atualizaColuna(column: Column) {
    this.alertService
      .confirmWithInput(
        'Atenção, editando todos os valores da coluna ' + column.label,
        'text',
        { inputAttributes: this.getDirectiveAttributes(column) }
      )
      .then((res) => {
        if (!res.isConfirmed) return;
  
        const raw = res.value;
        const parsed = this.parseNumberLoose(raw);
        const val: number | string =
          parsed !== null ? parsed : String(raw ?? '');
  
        for (const item of this.content) {
          this.processInputChange(item, column, val);
        }
  
        this.cdr.markForCheck();
      });
  }

  private parseNumberLoose(input: unknown): number | null {
    if (input == null) return null;
    if (typeof input === 'number') {
      return Number.isFinite(input) ? input : null;
    }
    if (typeof input !== 'string') return null;
  
    let s = input.trim();
    if (s === '') return null;
  
    // Normalização pt-BR: remove separadores de milhar e troca vírgula por ponto
    // Ex.: "1.234,56" -> "1234.56"
    s = s.replace(/,/g, '.');
  
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  forceDetectChanges(){
    this.cdr.detectChanges()
  }

  private getDirectiveAttributes(definition: Column): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (this.isPercent(definition)) {
      attrs['app-percentage'] = '';
    } else if (this.isCurrency(definition)) {
      attrs['app-currency'] = '';
    } else if (this.isEditable(definition)) {
      attrs['normalText'] = '';
    }
    return attrs;
  }

  private coerceValueForColumn(definition: Column, value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return this.isPercent(definition) ? null : value;
    }

    const hadPercent = trimmed.includes('%');
    const numeric = this.parseLocalizedNumber(trimmed);
    if (numeric === null) {
      return value;
    }

    if (this.isPercent(definition) && hadPercent) {
      return numeric / 100;
    }

    return numeric;
  }

  private parseLocalizedNumber(text: string): number | null {
    let normalized = text.replace(/\s+/g, '');
    normalized = normalized.replace(/R\$/gi, '');
    normalized = normalized.replace(/[%]/g, '');

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    if (hasComma && hasDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(',', '.');
    }

    const result = Number(normalized);
    return Number.isFinite(result) ? result : null;
  }
}
