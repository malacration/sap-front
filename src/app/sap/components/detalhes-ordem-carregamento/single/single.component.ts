import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';
import { OrdemCarregamento } from '../../../model/ordem-carregamento';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { InvoiceGenerationService } from '../../../service/invoice-generation.service';
import { PedidosVendaService } from '../../../service/document/pedidos-venda.service';

@Component({
  selector: 'app-ordem-carregamento-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class OrdemCarregamentoSingleComponent implements OnInit {
  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService,
    private invoiceGenerationService: InvoiceGenerationService,
    private businessPartnerService: BusinessPartnerService,
    private pedidosVendaService: PedidosVendaService
  ) {}

  @Input()
  selected: OrdemCarregamento = null;

  @Output()
  close = new EventEmitter();

  placa: string = '';
  nomeMotorista: string = '';
  transportadora: string = '';
  nomeOrdem: string = '';
  loading = false;
  pedidos: any[] = [];
  businesPartner : BusinessPartner = null;

  definition = [
    new Column('Núm. do Pedido', 'DocNum'),
    new Column('Cód. Cliente', 'CardCode'),
    new Column('Nome Cliente', 'CardName'),
    new Column('Cód. Item', 'ItemCode'),
    new Column('Dsc. Item', 'Dscription'),
    new Column('Quantidade', 'Quantity'),
    new Column('Un. Medida', 'UomCode')
  ];

  ngOnInit(): void {
    if (this.selected?.DocEntry) {
      this.loadPedidos(this.selected.DocEntry);
    }
  }

  loadPedidos(docEntry: number) {
    this.pedidosVendaService.search2(docEntry).subscribe({
      next: (response: any) => {
        this.pedidos = response.content;
      },
      error: (error) => {
        this.alertService.error('Erro ao carregar pedidos: ' + error.message);
      }
    });
  }

  selectBp($event) {
    this.businesPartner = $event;
    this.businessPartnerService.get(this.businesPartner.CardCode).subscribe(it => {
      this.businesPartner = it;
    });
  }

  voltar() {
    this.close.emit();
  }

  action(event: ActionReturn) {}

  gerarNotaFiscal() {
      this.loading = true;
      const pedido = this.pedidos[0]; 
      // if (!pedido || !pedido.DocEntry) {
      //   this.alertService.error('Nenhum pedido disponível para gerar nota fiscal.');
      //   this.loading = false;
      //   return;
      // }

      this.invoiceGenerationService.generateInvoiceFromLoadingOrder(93738).subscribe({
        next: (response) => {
          this.alertService.confirm('Nota fiscal gerada com sucesso!');
          this.selected.U_Status = 'Fechado';
        },
        error: (error) => {
          this.alertService.error('Erro ao gerar nota fiscal: ' + error.message);
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  confirmarCancelamento(docEntry: number) {
    this.alertService.confirm("Tem certeza que deseja cancelar este documento? Uma vez cancelado, não poderá ser revertido.")
      .then(it => {
        if (it.isConfirmed) {
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

  finalizarDocumento(docEntry: number) {
    this.loading = true;
    this.ordemCarregamentoService.finalizar(docEntry).subscribe({
      next: () => {
        this.alertService.confirm("Documento finalizado com sucesso!");
        this.selected.U_Status = "Fechado";
      },
      error: (err) => {
        this.alertService.error("Erro ao finalizar documento: " + err.message);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}