import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BPAddress } from '../../../model/business-partner';
import { Option } from '../../../model/form/option';

@Component({
  selector: 'app-endereco',
  templateUrl: './endereco.component.html',
})
export class EnderecoComponent implements OnChanges {

  constructor(private ref: ChangeDetectorRef){

  }

  @Input()
  endereco : BPAddress

  tipos = [new Option("bo_ShipTo","ENTREGA"),new Option("bo_BillTo","COBRANCA")]

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ref.detectChanges()
  }

  changeEstado($event){
    this.endereco.State = $event
  }

  changeCidade($event){
    this.endereco.County = $event
  }

  changeTipo($event){
    this.endereco.AddressType = $event
  }

}
