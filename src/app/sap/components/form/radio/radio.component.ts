import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RadioItem } from './radio.model';



@Component({
  selector: 'app-radio',
  templateUrl: './radio.component.html',
})
export class RadioComponent {

  @Input()
  opcoes : Array<RadioItem> = []

  @Output()
  change : EventEmitter<any> = new EventEmitter<any>();

  handleChange(content){
    this.change.emit(content)
  }

  

}
