import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Option } from '../../../../model/form/option';
import { CityService } from '../../../../service/addresses/city.service';
import { FormaPagamentoService } from '../../../../service/forma-pagamento.service';
import { SelectComponent } from '../select.component';


@Component({
  selector: 'app-forma-pagamento-select',
  templateUrl: './forma-pagamento-select.component.html'
})
export class FormaPagamentoSelectComponent implements OnInit, OnChanges {

  constructor(private service : FormaPagamentoService){
      
  }

  @Input()
  selected : string = null

  @Input()
  idFilial : number = null

  @Input()
  cardCode : string = null

  @ViewChild('selectComponent', {static: true}) selectComponent: SelectComponent;
  
  opcoes : Array<Option> = [
    new Option("AVISTA","DEPOSITO"),
    new Option("BB-RC-BOL-1199","BOLETO")
  ]

  loading = false

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange($event){
    this.selectedOut.emit($event)
  }

  ngOnInit(): void {
    this.getCondicoes()
  }  

  ngOnChanges(changes: SimpleChanges): void {
    this.getCondicoes()
  }

  getCondicoes(){
    this.loading = true
    this.service.getCondicoes(this.idFilial,this.cardCode).subscribe(it => {
      this.selectComponent.unselect()
      this.opcoes = it.map(it => new Option(it.PayMethCod,it.Description))
      this.loading = false
    })
  }

}
