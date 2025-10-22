import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamento } from '../../../model/logistica/ordem-carregamento';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { PedidosVendaService } from '../../../service/document/pedidos-venda.service';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';
import { LinhasPedido, PedidoVenda } from '../../document/documento.statement.component';
import { RomaneioPdfComponent } from '../romaneio-pdf/romaneio-pdf.component';
import { Router } from '@angular/router';
import { ItinerarioPdfComponent } from '../itinerario-pdf.component/itinerario-pdf.component';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';
import { OrderSalesService } from '../../../service/document/order-sales.service';

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
  loading: boolean = false;
  loadingPedidos: boolean = false;
  loadingMore: boolean = false;
  showItinerarioModal: boolean = false;
  showRomaneioModal: boolean = false;
  showLote: boolean = false;
  currentPedido: PedidoVenda | LinhasPedido | null = null;
  pedidos: any[] = [];
  pedidosOrdenados: any[] = [];
  businessPartner: BusinessPartner | null = null;
  lotesSelecionadosPorItem: Map<string, BatchStock[]> = new Map();
  localidadesMap: Map<string, string> = new Map();
  draggedIndex: number | null = null;
  placeholder: HTMLTableRowElement | null = null;
  nextLinkPedidos: string | null = null;

  @ViewChild('tableResponsive') tableResponsive: ElementRef;
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
    private OrderSalesService: OrderSalesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.selected?.DocEntry) {
      this.placa = this.selected.U_placa || '';
      this.nomeMotorista = this.selected.U_motorista || '';
      this.loadPedidos();
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

  loadPedidos(): void {
    this.loadingPedidos = true;
    this.pedidos = [];
    this.nextLinkPedidos = ''; // Inicializa para a primeira chamada
    this.loadMorePedidos();
  }

  loadMorePedidos(): void {
    if (this.nextLinkPedidos === null) return; // Não há mais páginas

    this.loadingMore = true;

    let observable;
    if (this.nextLinkPedidos === '') {
      observable = this.pedidosVendaService.search(this.selected!.DocEntry);
    } else {
      observable = this.OrderSalesService.searchAll(this.nextLinkPedidos);
    }

    observable.subscribe({
      next: (response: any) => {
        const grouped = this.groupPedidos(response.content);
        this.pedidos = [...this.pedidos, ...grouped];
        this.pedidosOrdenados = [...this.pedidos];
        this.nextLinkPedidos = response.nextLink || null;
        this.loadingPedidos = false;
        this.loadingMore = false;
      },
      error: () => {
        this.alertService.error('Erro ao carregar mais pedidos.');
        this.loadingPedidos = false;
        this.loadingMore = false;
      }
    });
  }

  private groupPedidos(content: any[]): any[] {
    const groupedPedidos = content.reduce((acc: any, pedido: any) => {
      const itemCode = pedido.ItemCode;
      if (!acc[itemCode]) {
        acc[itemCode] = { ...pedido, Quantity: 0, DocNum: pedido.DocNum };
      }
      acc[itemCode].Quantity += pedido.Quantity;
      return acc;
    }, {});
    return Object.values(groupedPedidos);
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

    this.ordemCarregamentoService.atualizarLogistica(this.selected!.DocEntry, dados).subscribe({
      next: () => {
        this.alertService.confirm('Dados de logística salvos com sucesso!');
        if (this.selected) {
          this.selected.U_placa = this.placa;
          this.selected.U_motorista = this.nomeMotorista;
        }
        this.updateLocalStorage();
      },
      error: (err) => {
        this.alertService.error('Erro ao salvar dados de logística: ' + (err.error?.message || err.message));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  voltar(): void {
    this.close.emit();
  }

  action(event: ActionReturn): void {
    // Implementar conforme necessário
  }

  gerarNotaFiscal(): void {
    if (this.pedidos.length === 0) {
      this.alertService.error('Nenhum pedido disponível para gerar nota fiscal.');
      return;
    }
    this.lotesSelecionadosPorItem.clear();
    this.currentPedido = this.pedidos[0];
    this.showLote = true;
    this.loading = false;
  }

  selecionarPedido(pedido: PedidoVenda | LinhasPedido): void {
    this.currentPedido = pedido;
  }

  lotesSelecionados(lotes: BatchStock[]): void {
    if (this.currentPedido && lotes.length > 0) {
      this.lotesSelecionadosPorItem.set(this.currentPedido.ItemCode, lotes);
    }
  }

  private atualizarStatusParaFechado(): void {
  this.loading = true;
  const dados = { U_Status: 'Fechado' };

  this.ordemCarregamentoService.atualizarStatus(this.selected!.DocEntry, dados).subscribe({
    next: () => {
      if (this.selected) {
        this.selected.U_Status = 'Fechado';
      }
      // Limpa localStorage quando fechar
      localStorage.removeItem(`placa_${this.selected!.DocEntry}`);
      localStorage.removeItem(`nomeMotorista_${this.selected!.DocEntry}`);
    },
    error: (err) => {
      this.alertService.error('Erro ao atualizar status: ' + (err.error?.message || err.message));
    },
    complete: () => {
      this.loading = false;
    }
  });
  }

confirmarNotaVerde(): void {
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

  this.ordemCarregamentoService.saveSelectedLotes(this.selected!.DocEntry, lotesToSave).subscribe({
    next: () => {
      this.alertService.confirm('Nota fiscal confirmada com sucesso!');
      
      this.atualizarStatusParaFechado();
      
      this.showLote = false;
      this.lotesSelecionadosPorItem.clear();
      this.currentPedido = null;
    },
    error: (error) => {
      this.alertService.error('Erro ao confirmar nota fiscal: ' + (error.error?.message || error.message));
      this.loading = false;
    }
  });
}

  editarOrdem(): void {
    if (this.selected?.U_Status === 'Fechado' || this.selected?.U_Status === 'Cancelado') {
      this.alertService.error('Não é possível editar uma ordem fechada ou cancelada.');
      return;
    }
    this.router.navigate(['/ordem-carregamento', this.selected!.DocEntry]);
  }

  finalizarDocumento(docEntry: number): void {
    this.loading = true;
    this.ordemCarregamentoService.finalizar(docEntry).subscribe({
      next: () => {
        this.alertService.confirm('Documento finalizado com sucesso!');
        if (this.selected) {
          this.selected.U_Status = 'Fechado';
          localStorage.removeItem(`placa_${this.selected.DocEntry}`);
          localStorage.removeItem(`nomeMotorista_${this.selected.DocEntry}`);
        }
        this.placa = '';
        this.nomeMotorista = '';
      },
      error: (err) => {
        this.alertService.error('Erro ao finalizar documento: ' + (err.error?.message || err.message));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  async abrirModalItinerario(): Promise<void> {
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
        if (res.content?.length > 0) {
          this.localidadesMap.set(this.pedidos[index].CardCode, res.content[0].Name);
        }
      });
      this.pedidosOrdenados = [...this.pedidos];
      this.showItinerarioModal = true;
    } catch (error) {
      this.alertService.error('Erro ao carregar localidades: ' + (error.message || 'Erro desconhecido'));
    } finally {
      this.loading = false;
    }
  }

  onDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
    event.dataTransfer!.setData('text/plain', index.toString());
    event.dataTransfer!.effectAllowed = 'move';
    (event.target as HTMLElement).classList.add('dragging');

    // Cria o placeholder (linha indicadora)
    this.placeholder = document.createElement('tr');
    this.placeholder.classList.add('placeholder');
    this.placeholder.innerHTML = '<td colspan="8"></td>';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';

    // Auto-scroll
    const container = this.tableResponsive.nativeElement;
    const containerRect = container.getBoundingClientRect();
    const y = event.clientY - containerRect.top;
    const scrollSpeed = 10;
    if (y < 50) {
      container.scrollTop -= scrollSpeed;
    } else if (y > containerRect.height - 50) {
      container.scrollTop += scrollSpeed;
    }

    // Posiciona o placeholder
    const tbody = event.currentTarget as HTMLTableSectionElement;
    const rows = Array.from(tbody.querySelectorAll('tr:not(.placeholder)')) as HTMLTableRowElement[];
    let insertBeforeRow: HTMLTableRowElement | null = null;

    for (const row of rows) {
      const box = row.getBoundingClientRect();
      if (event.clientY < box.top + box.height / 2) {
        insertBeforeRow = row;
        break;
      }
      if (event.clientY < box.bottom) {
        insertBeforeRow = row.nextSibling as HTMLTableRowElement;
      }
    }

    if (insertBeforeRow) {
      tbody.insertBefore(this.placeholder, insertBeforeRow);
    } else {
      tbody.appendChild(this.placeholder);
    }
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('dragging');
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.draggedIndex === null || !this.placeholder) return;

    const tbody = event.currentTarget as HTMLTableSectionElement;
    const movedItem = this.pedidosOrdenados.splice(this.draggedIndex, 1)[0];
    const placeholderIndex = Array.from(tbody.children).indexOf(this.placeholder);
    this.pedidosOrdenados.splice(placeholderIndex, 0, movedItem);

    this.placeholder.remove();
    this.placeholder = null;
    this.draggedIndex = null;
  }

  resetarOrdem(): void {
    this.pedidosOrdenados = [...this.pedidos];
  }

  gerarPDF(): void {
    if (this.nextLinkPedidos !== null) {
      this.alertService.error('Por favor, carregue todos os pedidos antes de gerar o PDF.');
      return;
    }
    if (!this.itinerarioPdfComponent) {
      this.alertService.error('Componente de PDF não está pronto. Tente novamente.');
      return;
    }
    this.itinerarioPdfComponent.gerarPdf();
  }

  abrirModalRomaneio(): void {
    if (this.pedidos.length === 0) {
      this.alertService.error('Nenhum pedido disponível para gerar romaneio.');
      return;
    }
    if (this.nextLinkPedidos !== null) {
      this.alertService.error('Por favor, carregue todos os pedidos antes de gerar o romaneio.');
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