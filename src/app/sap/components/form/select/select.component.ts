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

  onChange($event){
    const element = $event.currentTarget as HTMLSelectElement
    const value = element.value
    this.initialSelect = value
    this.selectedOut.emit(value)
  }

  ngOnInit(): void {
    
    }
}
