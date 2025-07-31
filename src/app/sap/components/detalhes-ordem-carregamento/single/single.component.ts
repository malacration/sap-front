import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';
import { OrdemCarregamento } from '../../../model/ordem-carregamento';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { PedidosVendaService } from '../../../service/document/pedidos-venda.service';
import { InvoiceGenerationService } from '../../../service/invoice-generation.service';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';
import { LinhasPedido, PedidoVenda } from '../../document/documento.statement.component';

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
    private pedidosVendaService: PedidosVendaService,
    private carregamentoService: OrdemCarregamentoService
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
  businesPartner: BusinessPartner = null;

  // Estado para o modal de lotes
  showLote = false;
  loadingPedidos = false;
  currentPedido: PedidoVenda | LinhasPedido | null = null; // Pedido atualmente selecionado no modal
  lotesSelecionadosPorItem: Map<string, BatchStock[]> = new Map(); // Armazena lotes por ItemCode

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
    this.loadingPedidos = true;
    this.pedidosVendaService.search2(docEntry).subscribe({
      next: (response: any) => {
        this.pedidos = response.content;
        this.loadingPedidos = false;
      },
      error: (error) => {
        this.alertService.error('Erro ao carregar pedidos: ' + error.message);
        this.loadingPedidos = false;
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
    if (this.pedidos.length === 0) {
      this.alertService.error('Nenhum pedido disponível para gerar nota fiscal.');
      return;
    }
    this.lotesSelecionadosPorItem.clear(); // Limpa seleções anteriores
    this.currentPedido = this.pedidos[0]; // Seleciona o primeiro pedido por padrão
    this.showLote = true;
  }

  // Seleciona um pedido no modal para configurar seus lotes
  selecionarPedido(pedido: PedidoVenda | LinhasPedido) {
    this.currentPedido = pedido;
  }

  // Armazena os lotes selecionados para o pedido atual
  lotesSelecionados(lotes: Array<BatchStock>) {
    if (this.currentPedido && lotes.length > 0) {
      this.lotesSelecionadosPorItem.set(this.currentPedido.ItemCode, lotes);
      console.log('Lotes armazenados para', this.currentPedido.ItemCode, lotes);
    }
  }

  // Confirma a Nota Verde para todos os pedidos com lotes selecionados
  confirmarNotaVerde() {
    if (this.lotesSelecionadosPorItem.size === 0) {
      this.alertService.error('Nenhum lote selecionado para confirmar nota verde.');
      return;
    }

    this.loading = true;

    // Processa os lotes de cada ItemCode
    const lotesToSave = Array.from(this.lotesSelecionadosPorItem.entries()).map(([itemCode, lotes]) => ({
      ItemCode: itemCode,
      Batches: lotes.map(lote => ({
        BatchNumber: lote.DistNumber,
        ExpDate: lote.ExpDate,
        InDate: lote.InDate,
        ItemName: lote.ItemName,
        MnfDate: lote.MnfDate,
        Quantity: lote.quantitySelecionadaEditable || lote.Quantity,
        WhsCode: lote.WhsCode
      }))
    }));

    this.ordemCarregamentoService.saveSelectedLotes(this.selected.DocEntry, lotesToSave).subscribe({
      next: (response) => {
        this.alertService.confirm('Nota verde confirmada com sucesso!');
        this.showLote = false;
        this.lotesSelecionadosPorItem.clear();
        this.currentPedido = null;
        this.selected.U_Status = 'Nota Verde Confirmada';
      },
      error: (error) => {
        this.alertService.error('Erro ao confirmar nota verde: ' + (error.error?.message || error.message));
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  confirmarCancelamento(docEntry: number) {
    this.alertService.confirm('Tem certeza que deseja cancelar este documento? Uma vez cancelado, não poderá ser revertido.')
      .then(it => {
        if (it.isConfirmed) {
          this.loading = true;
          this.ordemCarregamentoService.cancel(docEntry).subscribe({
            next: () => {
              this.alertService.confirm('Documento cancelado com sucesso!');
              this.selected.U_Status = 'Cancelado';
            },
            error: (err) => {
              this.alertService.error('Erro ao cancelar documento: ' + err.message);
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
        this.alertService.confirm('Documento finalizado com sucesso!');
        this.selected.U_Status = 'Fechado';
      },
      error: (err) => {
        this.alertService.error('Erro ao finalizar documento: ' + err.message);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}