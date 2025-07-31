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
import { Reprocessamento } from '../../../../modulos/producao/_model/reprocessamento';
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
  businesPartner : BusinessPartner = null;

  selectedPedido: PedidoVenda | LinhasPedido | null = null;

  lotesSelecionadosStorage: Array<BatchStock> = [];

  // Lote
  showLote = false;
  loadingPedidos = false;

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

  // Lote

  abrirModal() {
      this.showLote = true;
  }

lotesSelecionados(lotes: Array<BatchStock>) {
    this.lotesSelecionadosStorage = lotes;
    console.log('Lotes armazenados:', this.lotesSelecionadosStorage);
}

// Adicione esta função na classe OrdemCarregamentoSingleComponent
confirmarNotaVerde() {
    if (!this.selectedPedido) {
        this.alertService.error('Nenhum pedido selecionado para confirmar nota verde.');
        return;
    }

    if (!this.lotesSelecionadosStorage || this.lotesSelecionadosStorage.length === 0) {
        this.alertService.error('Nenhum lote selecionado para confirmar nota verde.');
        return;
    }

    this.loading = true;

    // Criar um objeto temporário com BatchNumber em vez de DistNumber
    const loteToSave = {
        BatchNumber: this.lotesSelecionadosStorage[0].DistNumber, // Mapeia DistNumber para BatchNumber
        ExpDate: this.lotesSelecionadosStorage[0].ExpDate,
        InDate: this.lotesSelecionadosStorage[0].InDate,
        ItemCode: this.lotesSelecionadosStorage[0].ItemCode,
        ItemName: this.lotesSelecionadosStorage[0].ItemName,
        MnfDate: this.lotesSelecionadosStorage[0].MnfDate,
        Quantity: this.lotesSelecionadosStorage.reduce((sum, lote) => sum + (lote.quantitySelecionadaEditable || lote.Quantity), 0), // Somar quantidades
        WhsCode: this.lotesSelecionadosStorage[0].WhsCode
    };

    this.ordemCarregamentoService.saveSelectedLotes(this.selected.DocEntry, loteToSave).subscribe({
        next: (response) => {
            this.alertService.confirm('Nota verde confirmada com sucesso!');
            this.showLote = false;
            this.lotesSelecionadosStorage = [];
            this.selected.U_Status = "Nota Verde Confirmada";
        },
        error: (error) => {
            this.alertService.error('Erro ao confirmar nota verde: ' + (error.error?.message || error.message));
        },
        complete: () => {
            this.loading = false;
        }
    });
}

loadPedidos(docEntry: number) {
  this.loadingPedidos = true; // Start loading
  this.pedidosVendaService.search2(docEntry).subscribe({
    next: (response: any) => {
      this.pedidos = response.content;
      this.loadingPedidos = false; // Stop loading on success
    },
    error: (error) => {
      this.alertService.error('Erro ao carregar pedidos: ' + error.message);
      this.loadingPedidos = false; // Stop loading on error
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
  
  this.selectedPedido = this.pedidos[0]; // Or derive from user selection
  this.abrirModal();
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