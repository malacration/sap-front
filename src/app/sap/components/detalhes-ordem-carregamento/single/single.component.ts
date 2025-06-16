import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';
import { OrdemCarregamento } from '../../../model/ordem-carregamento';

@Component({
  selector: 'app-ordem-carregamento-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class OrdemCarregamentoSingleComponent implements OnInit {
  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService
  ) {}

  cardName = "windson";
  id = "666";

  @Input()
  selected: OrdemCarregamento = null;

  @Output()
  close = new EventEmitter();

  placa: string = '';
  nomeMotorista: string = '';
  transportadora: string = '';
  nomeOrdem: string = '';

  ngOnInit(): void {
    this.selected.ORD_CRG_LINHACollection.forEach(it => {});
  }

  voltar() {
    this.close.emit();
  }

  action(event: ActionReturn) {}

  abrirModalPreview() {}

  definition = [
    new Column('Núm. do Pedido', 'U_docNumPedido'),
    new Column('Cód. Cliente', 'U_cardCode'),
    new Column('Nome Cliente', 'U_cardName'),
    new Column('Cód. Item', 'U_itemCode'),
    new Column('Dsc. Item', 'U_description'),
    new Column('Quantidade', 'U_quantidade'),
    new Column('Peso', 'U_pesoItem'),
    new Column('Un. Medida', 'U_unMedida'),
    new Column('Em Estoque', 'U_qtdEstoque'),
    new Column('Lote', ''),
  ];
}