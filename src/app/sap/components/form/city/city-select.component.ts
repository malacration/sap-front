import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Option } from '../../../model/form/option';
import { CityService } from '../../../service/addresses/city.service';


@Component({
  selector: 'app-city-select',
  templateUrl: './city-select.component.html'
})
export class CitySelectComponent implements OnInit, OnChanges {

  constructor(private service : CityService){
      
  }

  @Input()
  selected : string = null

  @Input()
  estado : string

  opcoes : Array<Option>

  loading = false

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange($event){
    this.selectedOut.emit($event)
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes)
    if(changes.estado && changes.estado.currentValue != changes.estado.previousValue){
      this.loading = true;
      this.service.get(changes.estado.currentValue).subscribe( data =>{
        console.log(data)
        this.opcoes = data.map(it => new Option(it.AbsId,it.Name))
        this.loading = false;
      })
    }
  }

  ngOnInit(): void {
  }  
}
