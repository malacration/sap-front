import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { StateService } from '../../../service/addresses/state.service';
import { Option } from '../../../model/form/option';



@Component({
  selector: 'app-state-select',
  templateUrl: './state-select.component.html',
  styleUrls: ['./state-select.component.scss']
})
export class StateSelectComponent implements OnInit {

  constructor(private service : StateService){
      
  }

  @Input()
  selected : string = null

  @Output()
  selectedOut = new EventEmitter<string>();

  opcoes : Array<Option>

  loading = false

  onChange($event){
    this.selected = $event
    this.selectedOut.emit(this.selected)
  }

  ngOnInit(): void {
    this.loading = true;
    this.service.get().subscribe( data =>{
      this.opcoes = data.map(it => new Option(it.Code,it.Name))
      this.loading = false
    })
  }
  
}
