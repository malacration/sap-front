import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { Option } from '../../../../model/form/option';
import { CondicaoPagamento, CondicaoPagamentoService } from '../../../../service/condicao-pagamento.service';


@Component({
    selector: 'app-condicao-pagamento-select',
    templateUrl: './condicao-pagamento-select.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
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
    this.selectedOut.emit($event)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes.tabela && changes.tabela.currentValue != changes.tabela.previousValue){
      this.loading = true;
      this.service.getByTabela(changes.tabela.currentValue).subscribe( data =>{
        this.opcoes = data.map(it => new Option(it,it.PymntGroup))
        this.selected = data.find(term =>
          String(term.GroupNum) === String(this.selected?.GroupNum)
          && String(term.ListNum) === String(this.selected?.ListNum ?? changes.tabela.currentValue)
        ) ?? this.selected
        this.loading = false;
      })
    }
  }

  ngOnInit(): void {
  }  
}
