import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Option } from '../../../../model/form/option';
import { CondicaoPagamento, CondicaoPagamentoService } from '../../../../service/condicao-pagamento.service';


@Component({
  selector: 'app-condicao-pagamento-select',
  templateUrl: './condicao-pagamento-select.component.html'
})
export class CondicaoPagamentoSelectComponent implements OnInit, OnChanges {

  constructor(private service : CondicaoPagamentoService){
      
  }

  @Input()
  selected : CondicaoPagamento = null

  @Input()
  tabela : string = null

  opcoes : Array<Option> = []

  loading = false

  @Output()
  selectedOut = new EventEmitter<CondicaoPagamento>();

  onChange($event : CondicaoPagamento){
    console.log(JSON.stringify($event));
    this.selectedOut.emit($event)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.tabela && changes.tabela.currentValue != changes.tabela.previousValue){
      this.loading = true;
      this.service.getByTabela(changes.tabela.currentValue).subscribe( data =>{
        this.opcoes = data.map(it => new Option(it,it.pymntGroup))
        this.loading = false;
      })
    }
  }

  ngOnInit(): void {
  }  
}
