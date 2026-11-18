import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { SearchComponent } from '../../../../shared/components/search/search.component';
import { BusinessPartner } from '../../../../sap/model/business-partner/business-partner';
import { TransportadoraService } from '../../_services/transportadora.service';


@Component({
    selector: 'app-transportadora-search',
    templateUrl: './transportadora-search.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TransportadoraSearchComponent implements OnInit {

  @ViewChild(SearchComponent, {static: true}) search: SearchComponent<BusinessPartner>

  private atual: BusinessPartner | null = null

  /**
   * Transportadora mostrada no campo (a gravada na ordem, ou null para limpar) sem disparar (selected).
   * Escreve direto no modal porque o initialContent dele ignora null: trocar para uma ordem sem
   * transportadora deixaria a da ordem anterior na tela.
   */
  @Input()
  set transportadora(value: BusinessPartner | null) {
    this.atual = value || null
    this.aplica()
  }

  ngOnInit(): void {
    this.aplica()
  }

  private aplica(){
    if(this.search?.modalSelect)
      this.search.modalSelect.content = this.atual
  }

  // Sem limite de credito: fornecedor nao tem, e as colunas de cliente so confundiam a lista.
  // Texto do cadastro passa por '{{value}}' porque a tabela renderiza via innerHTML sem sanitizar.
  definition = [
    new Column('Id', 'CardCode', '{{value}}'),
    new Column('Nome', 'CardName', '{{value}}'),
    new Column('Doc.', 'CpfCnpjStr', '{{value}}')
  ]

  @Output()
  selected = new EventEmitter();

  constructor(public transportadoraService : TransportadoraService){

  }

  selectedFun($event){
    this.selected.emit($event)
  }

}
