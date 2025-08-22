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
  showItinerarioModal = false;
  pedidosOrdenados: any[] = [];
  private draggedItemIndex: number;

  // Estado para o modal de lotes
  showLote = false;
  loadingPedidos = false;
  currentPedido: PedidoVenda | LinhasPedido | null = null;
  lotesSelecionadosPorItem: Map<string, BatchStock[]> = new Map();
  localidadesMap: Map<string, string> = new Map();

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
    }
  }

  loadPedidos(docEntry: number) {
    this.loadingPedidos = true;
    this.pedidosVendaService.search2(docEntry).subscribe({
      next: (response: any) => {
        // Agrupar pedidos por ItemCode e somar Quantity
        const groupedPedidos = response.content.reduce((acc, pedido) => {
          const itemCode = pedido.ItemCode;
          if (!acc[itemCode]) {
            acc[itemCode] = {
              ...pedido,
              Quantity: 0,
              DocNum: pedido.DocNum // Preserva DocNum, mas pode ser ajustado se necessário
            };
          }
          acc[itemCode].Quantity += pedido.Quantity;
          return acc;
        }, {});

        // Converter o objeto agrupado em array
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
      this.alertService.error('Nenhum lote selecionado para confirmar nota verde.');
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

  async abrirModalItinerario() {
    if (this.pedidos.length === 0) {
        this.alertService.error('Nenhum pedido disponível para gerar itinerário.');
        return;
    }
    
    // Carrega as localidades primeiro
    this.loading = true;
    try {
        // Criar um array de promessas para todas as localidades
        const promises = this.pedidos.map(pedido => 
            this.pedidosVendaService.searchLocalidade(20).toPromise()
        );
        
        // Esperar todas as requisições terminarem
        const results = await Promise.all(promises);
        
        // Mapear os resultados
        results.forEach((res, index) => {
            if (res.content && res.content.length > 0) {
                this.localidadesMap.set(this.pedidos[index].CardCode, res.content[0].Name);
            }
        });
        
        // Agora pode abrir o modal
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
}