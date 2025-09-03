import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
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
import { ItinerarioPdfComponent } from '../itinerario-pdf/itinerario-pdf.component';
import { Branch } from '../../../model/branch';
import { Localidade } from '../../../model/localidade/localidade';
import { NextLink } from '../../../model/next-link';
import { OrderSalesService } from '../../../service/document/order-sales.service';
import { forkJoin } from 'rxjs';
import { RomaneioPdfComponent } from '../romaneio-pdf/romaneio-pdf.component';
import { Router } from '@angular/router'; // AJUSTE: Importado Router para navegação

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
    private carregamentoService: OrdemCarregamentoService,
    private orderSalesService: OrderSalesService,
    private router: Router // AJUSTE: Injetado Router
  ) {}

  @Input()
  selected: OrdemCarregamento = null;

  @Output()
  close = new EventEmitter(); // Fixed typo: changed 'closet' to 'close'

  placa: string = '';
  nomeMotorista: string = '';
  formTouched: boolean = false;
  transportadora: string = '';
  nomeOrdem: string = '';
  loading = false;
  pedidos: any[] = [];
  businesPartner: BusinessPartner = null;
  showItinerarioModal = false;
  pedidosOrdenados: any[] = [];
  private draggedItemIndex: number;

  showLote = false;
  loadingPedidos = false;
  currentPedido: PedidoVenda | LinhasPedido | null = null;
  lotesSelecionadosPorItem: Map<string, BatchStock[]> = new Map();
  localidadesMap: Map<string, string> = new Map();

  // AJUSTE: Removidas variáveis de modais adicionar/remover

  showRomaneioModal = false;

  @ViewChild('romaneioPdfComponent') romaneioPdfComponent: RomaneioPdfComponent;

  @ViewChild(ItinerarioPdfComponent) itinerarioPdfComponent: ItinerarioPdfComponent;

  definition = [
    new Column('Núm. do Pedido', 'DocNum'),
    new Column('Cód. Cliente', 'CardCode'),
    new Column('Nome Cliente', 'CardName'),
    new Column('Localidade', 'Localidade'), 
    new Column('Cód. Item', 'ItemCode'),
    new Column('Dsc. Item', 'Dscription'),
    new Column('Quantidade', 'Quantity'),
    new Column('Un. Medida', 'UomCode')
  ];

  ngOnInit(): void {
    if (this.selected?.DocEntry) {
      this.loadPedidos(this.selected.DocEntry);
      this.placa = localStorage.getItem(`placa_${this.selected.DocEntry}`) || '';
      this.nomeMotorista = localStorage.getItem(`nomeMotorista_${this.selected.DocEntry}`) || '';
    }
  }

  updateLocalStorage() {
    if (this.selected?.DocEntry) {
      localStorage.setItem(`placa_${this.selected.DocEntry}`, this.placa);
      localStorage.setItem(`nomeMotorista_${this.selected.DocEntry}`, this.nomeMotorista);
    }
  }

  onFormChange() {
    this.formTouched = true;
  }

  loadPedidos(docEntry: number) {
    this.loadingPedidos = true;
    this.pedidosVendaService.search2(docEntry).subscribe({
      next: (response: any) => {
        const groupedPedidos = response.content.reduce((acc, pedido) => {
          const itemCode = pedido.ItemCode;
          if (!acc[itemCode]) {
            acc[itemCode] = {
              ...pedido,
              Quantity: 0,
              DocNum: pedido.DocNum
            };
          }
          acc[itemCode].Quantity += pedido.Quantity;
          return acc;
        }, {});
        this.pedidos = Object.values(groupedPedidos);
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
    if (this.selected?.DocEntry) {
      localStorage.removeItem(`placa_${this.selected.DocEntry}`);
      localStorage.removeItem(`nomeMotorista_${this.selected.DocEntry}`);
    }
    this.placa = '';
    this.nomeMotorista = '';
    this.close.emit();
  }

  action(event: ActionReturn) {}

  gerarNotaFiscal() {
    if (this.pedidos.length === 0) {
      this.alertService.error('Nenhum pedido disponível para gerar nota fiscal.');
      return;
    }
    this.lotesSelecionadosPorItem.clear();
    this.currentPedido = this.pedidos[0];
    this.showLote = true;
  }

  selecionarPedido(pedido: PedidoVenda | LinhasPedido) {
    this.currentPedido = pedido;
  }

  lotesSelecionados(lotes: Array<BatchStock>) {
    if (this.currentPedido && lotes.length > 0) {
      this.lotesSelecionadosPorItem.set(this.currentPedido.ItemCode, lotes);
      console.log('Lotes armazenados para', this.currentPedido.ItemCode, lotes);
    }
  }

  confirmarNotaVerde() {
    if (this.lotesSelecionadosPorItem.size === 0) {
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
      next: (response) => {
        this.alertService.confirm('Nota fiscal confirmada com sucesso!');
        this.showLote = false;
        this.lotesSelecionadosPorItem.clear();
        this.currentPedido = null;
        this.selected.U_Status = 'Nota fiscal Confirmada';
        this.loading = false; // Garante que o loading seja resetado no sucesso
      },
      error: (error) => {
        this.alertService.error('Erro ao confirmar nota fiscal: ' + (error.error?.message || error.message));
        this.loading = false; // Reseta o loading em caso de erro
      },
      complete: () => {
        this.loading = false; // Já existe, mas mantemos para consistência
      }
    });
  }

  // AJUSTE: Novo método para editar ordem (navega para rota com ID)
  editarOrdem() {
    if (this.selected.U_Status === 'Fechado' || this.selected.U_Status === 'Cancelado') {
      this.alertService.error('Não é possível editar uma ordem fechada ou cancelada.');
      return;
    }
    this.router.navigate(['/ordem-carregamento', this.selected.DocEntry]);
  }

  finalizarDocumento(docEntry: number) {
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

  async abrirModalItinerario() {
    if (this.pedidos.length === 0) {
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
        if (res.content && res.content.length > 0) {
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

  onDragStart(event: DragEvent, index: number) {
    this.draggedItemIndex = index;
    event.dataTransfer.setData('text/plain', index.toString());
    event.dataTransfer.effectAllowed = 'move';
    const element = event.target as HTMLElement;
    element.classList.add('dragging');
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const element = event.target as HTMLElement;
    if (element.nodeName === 'TR') {
      element.classList.add('drag-over');
    }
  }

  onDragEnd(event: DragEvent) {
    const element = event.target as HTMLElement;
    element.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  onDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    if (this.draggedItemIndex === undefined) return;
    const movedItem = this.pedidosOrdenados[this.draggedItemIndex];
    this.pedidosOrdenados.splice(this.draggedItemIndex, 1);
    this.pedidosOrdenados.splice(targetIndex, 0, movedItem);
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    (event.target as HTMLElement).classList.remove('drag-over');
  }

  resetarOrdem() {
    this.pedidosOrdenados = [...this.pedidos];
  }

  gerarPDF() {
    const headContent = document.head.innerHTML;
    this.itinerarioPdfComponent.gerarPdf(headContent);
  }

  // AJUSTE: Removidas funções de adicionar/remover modais

  abrirModalRomaneio() {
    if (this.pedidos.length === 0) {
      this.alertService.error('Nenhum pedido disponível para gerar romaneio.');
      return;
    }
    if (!this.placa || !this.nomeMotorista) {
      this.formTouched = true;
      this.alertService.error('A placa do veículo e o nome do motorista são obrigatórios.');
      return;
    }
    this.showRomaneioModal = true;
  }

  gerarRomaneioPDF() {
    if (!this.placa || !this.nomeMotorista) {
      this.formTouched = true;
      this.alertService.error('A placa do veículo e o nome do motorista são obrigatórios.');
      return;
    }
    this.romaneioPdfComponent.gerarPdf();
  }
}