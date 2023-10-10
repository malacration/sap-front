import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Option } from '../../../model/form/option';


@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent implements OnInit {
  
  @Input()
  label = 'Selecione'

  @Input()
  loading : boolean = false

  @Input()
  options : Array<Option> = [
    
  ]

  @Input()
  initialSelect : string = ''
  
  @Output()
  selectedOut = new EventEmitter<string>();

  onChange(valor : string){
    this.initialSelect = valor
    this.selectedOut.emit(valor)
  }

  ngOnInit(): void {
    
    }
}
