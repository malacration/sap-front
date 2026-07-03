import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Option } from '../../../sap/model/form/option';


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
    this.initialSelect = this.selected
    this.selectedOut.emit(this.selected)
  }

  ngOnInit(): void {
    if(this.initialSelect)
      this.selected = this.initialSelect
  }

  unselect(){
    this.selected = 'inicial'
  }

  // Mantém os <option> estáveis entre ciclos de change detection.
  // Sem isso, getters que retornam um novo array a cada CD fazem o Angular
  // recriar todos os <option>, o que no Firefox fecha o dropdown nativo aberto.
  trackByOption(_: number, it: Option){
    return it?.value;
  }
}
