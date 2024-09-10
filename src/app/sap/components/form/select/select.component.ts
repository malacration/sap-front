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

  selected = 'inicial'

  @Input()
  initialSelect : any
  
  @Output()
  selectedOut = new EventEmitter<any>();

  onChange($event){
    console.log("Event",$event)
    this.initialSelect = this.selected
    this.selectedOut.emit(this.selected)
  }

  ngOnInit(): void {
    
  }

  unselect(){
    this.selected = 'inicial'
  }
}
