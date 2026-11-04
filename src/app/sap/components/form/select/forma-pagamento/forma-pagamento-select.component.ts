import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { Option } from '../../../../model/form/option';
import { FormaPagamentoService } from '../../../../service/forma-pagamento.service';


@Component({
    selector: 'app-forma-pagamento-select',
    templateUrl: './forma-pagamento-select.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class FormaPagamentoSelectComponent implements OnChanges {

  constructor(private service : FormaPagamentoService){
      
  }

  @Input()
  selected : string = null

  @Input()
  idFilial : number = null

  @Input()
  cardCode : string = null

  opcoes : Array<Option> = [
    new Option("AVISTA","DEPOSITO"),
    new Option("BB-RC-BOL-1199","BOLETO")
  ]

  loading = false
  private requestSequence = 0

  @Output()
  selectedOut = new EventEmitter<string>();

  onChange($event){
    this.selectedOut.emit($event)
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['idFilial'] || changes['cardCode'])
      this.getCondicoes()
  }

  getCondicoes(){
    const requestId = ++this.requestSequence
    if(this.idFilial == null || !this.cardCode){
      this.opcoes = []
      this.loading = false
      this.clearInvalidSelection()
      return
    }

    this.loading = true
    this.service.getCondicoes(this.idFilial,this.cardCode).subscribe({
      next: it => {
        if(requestId != this.requestSequence) return
        this.opcoes = it.map(it => new Option(it.PayMethCod,it.Description))
        const selectionIsValid = this.opcoes.some(option => String(option.value) == String(this.selected))
        if(!selectionIsValid)
          this.clearInvalidSelection()
        this.loading = false
      },
      error: () => {
        if(requestId != this.requestSequence) return
        this.opcoes = []
        this.clearInvalidSelection()
        this.loading = false
      }
    })
  }

  private clearInvalidSelection(){
    if(this.selected == null || this.selected === '') return
    this.selected = null
    this.selectedOut.emit(null)
  }

}
