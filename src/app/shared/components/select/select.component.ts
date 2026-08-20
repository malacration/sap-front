import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Option } from '../../../sap/model/form/option';


@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent implements OnInit, OnChanges {
  
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

  // initialSelect pode mudar depois que o componente ja existe - ex.: trocar o
  // cliente na tela de venda troca a lista de enderecos de entrega e o
  // endereco default. Sem sincronizar aqui, o <select> continuaria mostrando a
  // selecao antiga (ou nada, quando o valor nao existe mais nas options novas)
  // enquanto o pai ja trabalha com outro valor.
  ngOnChanges(changes: SimpleChanges): void {
    if(changes['initialSelect'] && !changes['initialSelect'].firstChange)
      this.selected = this.initialSelect ?? 'inicial'
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
