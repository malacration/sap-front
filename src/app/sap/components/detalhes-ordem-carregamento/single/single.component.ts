import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';
import { OrdemCarregamento } from '../../../model/ordem-carregamento';
import { InvoiceGenerationService } from '../../../service/invoice-generation.service';

@Component({
  selector: 'app-ordem-carregamento-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class OrdemCarregamentoSingleComponent implements OnInit {
  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService,
    private invoiceGenerationService: InvoiceGenerationService
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
  loading = false;

  ngOnInit(): void {
    this.selected.ORD_CRG_LINHACollection.forEach(it => {});
  }

  voltar() {
    this.close.emit();
  }

  action(event: ActionReturn) {}

  gerarNotaFiscal() {
    this.loading = true;
    this.invoiceGenerationService.generateInvoiceFromLoadingOrder(this.selected)
      .subscribe({
        next: (response) => {
          this.alertService.confirm('Nota fiscal gerada com sucesso!');
          // You might want to refresh the data or navigate somewhere
        },
        error: (error) => {
          this.alertService.error('Erro ao gerar nota fiscal: ' + error.message);
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  abrirModalPreview() {
    this.alertService.confirm('Deseja gerar a nota fiscal para esta ordem de carregamento?')
      .then(result => {
        if (result.isConfirmed) {
          this.gerarNotaFiscal();
        }
      });
  }

  confirmarCancelamento(docEntry: number) {
    this.alertService.confirm("Tem certeza que deseja cancelar este documento? Uma vez cancelado, não poderá ser revertido.")
      .then(it => {
        if(it.isConfirmed) {
          this.loading = true;
          this.ordemCarregamentoService.cancel(docEntry).subscribe({
            next: () => {
              this.alertService.confirm("Documento cancelado com sucesso!");
              this.selected.U_Status = "Cancelado";
            },
            error: (err) => {
              this.alertService.error("Erro ao cancelar documento: " + err.message);
            },
            complete: () => {
              this.loading = false;
            }
          });
        }
      });
  }

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