import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamento } from '../../../model/ordem-carregamento';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { PedidosVendaService } from '../../../service/document/pedidos-venda.service';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';
import { LinhasPedido, PedidoVenda } from '../../document/documento.statement.component';
import { RomaneioPdfComponent } from '../romaneio-pdf/romaneio-pdf.component';
import { Router } from '@angular/router';
import { ItinerarioPdfComponent } from '../itinerario-pdf.component/itinerario-pdf.component';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';

@Component({
  selector: 'app-ordem-carregamento-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class OrdemCarregamentoSingleComponent implements OnInit {
  @Input() selected: OrdemCarregamento | null = null;
  @Output() close = new EventEmitter<void>();

  placa: string = '';
  nomeMotorista: string = '';
  formTouched: boolean = false;
  loading = false;
  loadingPedidos = false;
  showItinerarioModal = false;
  showRomaneioModal = false;
  showLote = false;
  currentPedido: PedidoVenda | LinhasPedido | null = null;
  pedidos: any[] = [];
  pedidosOrdenados: any[] = [];
  businessPartner: BusinessPartner | null = null;
  lotesSelecionadosPorItem: Map<string, BatchStock[]> = new Map();
  localidadesMap: Map<string, string> = new Map();

  @ViewChild(ItinerarioPdfComponent) itinerarioPdfComponent: ItinerarioPdfComponent;
  @ViewChild(RomaneioPdfComponent) romaneioPdfComponent: RomaneioPdfComponent;

  definition: Column[] = [
    new Column('Núm. do Pedido', 'DocNum'),
    new Column('Cód. Cliente', 'CardCode'),
    new Column('Nome Cliente', 'CardName'),
    new Column('Localidade', 'Localidade'),
    new Column('Cód. Item', 'ItemCode'),
    new Column('Dsc. Item', 'Dscription'),
    new Column('Quantidade', 'Quantity'),
    new Column('Un. Medida', 'UomCode')
  ];

  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService,
    private businessPartnerService: BusinessPartnerService,
    private pedidosVendaService: PedidosVendaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.selected?.DocEntry) {
      this.loadPedidos(this.selected.DocEntry);
      this.placa = this.selected.U_placa || '';
      this.nomeMotorista = this.selected.U_motorista || '';
    }
  }
  private validateForm(): boolean {
    this.formTouched = true;
    if (!this.placa || !this.nomeMotorista) {
      this.alertService.error('A placa do veículo e o nome do motorista são obrigatórios.');
      return false;
    }
    return true;
  }

  private updateLocalStorage(): void {
    if (this.selected?.DocEntry) {
      localStorage.setItem(`placa_${this.selected.DocEntry}`, this.placa);
      localStorage.setItem(`nomeMotorista_${this.selected.DocEntry}`, this.nomeMotorista);
    }
  }

  loadPedidos(docEntry: number): void {
    this.loadingPedidos = true;
    this.pedidosVendaService.search2(docEntry).subscribe({
      next: (response: any) => {
        const groupedPedidos = response.content.reduce((acc, pedido) => {
          const itemCode = pedido.ItemCode;
          if (!acc[itemCode]) {
            acc[itemCode] = { ...pedido, Quantity: 0, DocNum: pedido.DocNum };
          }
          acc[itemCode].Quantity += pedido.Quantity;
          return acc;
        }, {});
        this.pedidos = Object.values(groupedPedidos);
        this.pedidosOrdenados = [...this.pedidos];
        this.loadingPedidos = false;
      },
      error: () => {
        this.alertService.error('Erro ao carregar pedidos.');
        this.loadingPedidos = false;
      }
    });
  }

  selectBp(event: BusinessPartner): void {
    this.businessPartner = event;
    this.businessPartnerService.get(event.CardCode).subscribe({
      next: (bp: BusinessPartner) => {
        this.businessPartner = bp;
      },
      error: () => {
        this.alertService.error('Erro ao carregar dados do parceiro de negócios.');
      }
    });
  }

  salvarLogistica(): void {
    if (!this.validateForm()) {
        return;
    }
    this.loading = true;
    const dados = {
        U_placa: this.placa,
        U_motorista: this.nomeMotorista
    };

    this.ordemCarregamentoService.atualizarLogistica(this.selected.DocEntry, dados).subscribe({
        next: () => {
            this.alertService.confirm('Dados de logística salvos com sucesso!');
            // Atualiza o objeto local para refletir a mudança
            if(this.selected) {
                this.selected.U_placa = this.placa;
                this.selected.U_motorista = this.nomeMotorista;
            }
        },
        error: (err) => {
            this.alertService.error('Erro ao salvar dados de logística: ' + (err.error?.message || err.message));
        },
        complete: () => {
            this.loading = false;
        }
    });
  }

  voltar(): void {
    this.close.emit();
  }

  action(event: ActionReturn): void {}

  gerarNotaFiscal(): void {
    if (this.pedidos.length == 0) {
      this.alertService.error('Nenhum pedido disponível para gerar nota fiscal.');
      return;
    }
    this.lotesSelecionadosPorItem.clear();
    this.currentPedido = this.pedidos[0];
    this.showLote = true;
  }

  selecionarPedido(pedido: PedidoVenda | LinhasPedido): void {
    this.currentPedido = pedido;
  }

  lotesSelecionados(lotes: BatchStock[]): void {
    if (this.currentPedido && lotes.length > 0) {
      this.lotesSelecionadosPorItem.set(this.currentPedido.ItemCode, lotes);
    }
  }

  confirmarNotaVerde(): void {
    if (this.lotesSelecionadosPorItem.size == 0) {
      this.alertService.error('Nenhum lote selecionado para confirmar nota fiscal.');
      return;
    }
    this.loading = true;
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
      next: () => {
        this.alertService.confirm('Nota fiscal confirmada com sucesso!');
        this.showLote = false;
        this.lotesSelecionadosPorItem.clear();
        this.currentPedido = null;
        this.selected.U_Status = 'Nota fiscal Confirmada';
      },
      error: (error) => {
        this.alertService.error('Erro ao confirmar nota fiscal: ' + (error.error?.message || error.message));
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  editarOrdem(): void {
    if (this.selected.U_Status == 'Fechado' || this.selected.U_Status == 'Cancelado') {
      this.alertService.error('Não é possível editar uma ordem fechada ou cancelada.');
      return;
    }
    this.router.navigate(['/ordem-carregamento', this.selected.DocEntry]);
  }

  finalizarDocumento(docEntry: number): void {
    this.loading = true;
    this.ordemCarregamentoService.finalizar(docEntry).subscribe({
      next: () => {
        this.alertService.confirm('Documento finalizado com sucesso!');
        this.selected.U_Status = 'Fechado';
        if (this.selected?.DocEntry) {
          localStorage.removeItem(`placa_${this.selected.DocEntry}`);
          localStorage.removeItem(`nomeMotorista_${this.selected.DocEntry}`);
        }
        this.placa = '';
        this.nomeMotorista = '';
      },
      error: (err) => {
        this.alertService.error('Erro ao finalizar documento: ' + err.message);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  async abrirModalItinerario(): Promise<void> {
    if (this.pedidos.length == 0) {
      this.alertService.error('Nenhum pedido disponível para gerar itinerário.');
      return;
    }
    this.loading = true;
    try {
      const promises = this.pedidos.map(pedido =>
        this.pedidosVendaService.searchLocalidade(20).toPromise()
      );
      const results = await Promise.all(promises);
      results.forEach((res, index) => {
        if (res.content?.length > 0) {
          this.localidadesMap.set(this.pedidos[index].CardCode, res.content[0].Name);
        }
      });
      this.pedidosOrdenados = [...this.pedidos];
      this.showItinerarioModal = true;
    } catch (error) {
      this.alertService.error('Erro ao carregar localidades: ' + error.message);
    } finally {
      this.loading = false;
    }
  }

  onDragStart(event: DragEvent, index: number): void {
    event.dataTransfer.setData('text/plain', index.toString());
    event.dataTransfer.effectAllowed = 'move';
    (event.target as HTMLElement).classList.add('dragging');
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const element = event.target as HTMLElement;
    if (element.nodeName == 'TR') {
      element.classList.add('drag-over');
    }
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    const draggedIndex = parseInt(event.dataTransfer.getData('text/plain'), 10);
    const movedItem = this.pedidosOrdenados[draggedIndex];
    this.pedidosOrdenados.splice(draggedIndex, 1);
    this.pedidosOrdenados.splice(targetIndex, 0, movedItem);
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    (event.target as HTMLElement).classList.remove('drag-over');
  }

  resetarOrdem(): void {
    this.pedidosOrdenados = [...this.pedidos];
  }

  gerarPDF(): void {
    const headContent = document.head.innerHTML;
    this.itinerarioPdfComponent.gerarPdf(headContent);
  }

  abrirModalRomaneio(): void {
    if (this.pedidos.length == 0) {
      this.alertService.error('Nenhum pedido disponível para gerar romaneio.');
      return;
    }
    if (!this.validateForm()) {
      return;
    }
    this.showRomaneioModal = true;
  }

  gerarRomaneioPDF(): void {
    if (!this.validateForm()) {
      return;
    }
    this.romaneioPdfComponent.gerarPdf();
  }
}