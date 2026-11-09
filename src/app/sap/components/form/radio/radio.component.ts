import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { RadioItem } from './radio.model';



@Component({
    selector: 'app-radio',
    templateUrl: './radio.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class RadioComponent {

  @Input()
  opcoes : Array<RadioItem> = []

  @Input()
  selected : any

  readonly groupName = `radio-${Math.random().toString(36).slice(2)}`

  @Output()
  change : EventEmitter<any> = new EventEmitter<any>();

  handleChange(content){
    this.change.emit(content)
  }

  

}
