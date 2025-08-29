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
    private orderSalesService: OrderSalesService
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

  showCancelamentoModal = false;
  pedidosParaCancelamento: any[] = [];
  pedidosFiltrados: any[] = [];
  pedidosSelecionados: any[] = [];
  selectAllPedidos = false;
  loadingCancelamento = false;
  filtroPesquisa = '';

  showAdicionarPedidosModal = false;
  pedidosDisponiveis: any[] = [];
  pedidosDisponiveisFiltrados: any[] = [];
  pedidosSelecionadosAdicionar: any[] = [];
  selectAllDisponiveis = false;
  loadingAdicionarPedidos = false;
  filtroPesquisaAdicionar = '';
  filtroDataInicial: string = '';
  filtroDataFinal: string = '';
  branchFiltro: Branch = null;
  localidadeFiltro: Localidade = null;
  groupedPedidosDisponiveis: { DocNum: string, CardName: string, items: any[], isCollapsed: boolean, allSelected: boolean }[] = [];

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

  abrirModalCancelamento() {
    if (this.pedidos.length === 0) {
      this.alertService.error('Nenhum pedido disponível para cancelamento.');
      return;
    }
    this.pedidosParaCancelamento = this.pedidos.map(pedido => ({
      ...pedido,
      selected: false,
      U_Status: pedido.U_Status || 'Aberto'
    }));
    this.pedidosFiltrados = [...this.pedidosParaCancelamento];
    this.pedidosSelecionados = [];
    this.selectAllPedidos = false;
    this.filtroPesquisa = '';
    this.showCancelamentoModal = true;
  }

  filtrarPedidos() {
    if (!this.filtroPesquisa) {
      this.pedidosFiltrados = [...this.pedidosParaCancelamento];
    } else {
      const termo = this.filtroPesquisa.toLowerCase().trim();
      this.pedidosFiltrados = this.pedidosParaCancelamento.filter(pedido =>
        pedido.DocNum.toString().toLowerCase().includes(termo)
      );
    }
    this.verificarSelecaoTotal();
  }

  limparFiltro() {
    this.filtroPesquisa = '';
    this.filtrarPedidos();
  }

  fecharModalCancelamento() {
    this.showCancelamentoModal = false;
    this.pedidosParaCancelamento = [];
    this.pedidosFiltrados = [];
    this.pedidosSelecionados = [];
    this.filtroPesquisa = '';
  }

  toggleSelectAll() {
    this.pedidosFiltrados.forEach(pedido => {
      if (pedido.U_Status !== 'Cancelado') {
        pedido.selected = this.selectAllPedidos;
      }
    });
    this.verificarSelecaoTotal();
  }

  verificarSelecaoTotal() {
    this.pedidosSelecionados = this.pedidosParaCancelamento.filter(p => p.selected);
    const pedidosNaoCanceladosVisiveis = this.pedidosFiltrados.filter(p => p.U_Status !== 'Cancelado');
    this.selectAllPedidos = pedidosNaoCanceladosVisiveis.length > 0 && 
                           pedidosNaoCanceladosVisiveis.every(p => p.selected);
  }

  confirmarCancelamentoSelecionados() {
    if (this.pedidosSelecionados.length === 0) {
      this.alertService.error('Nenhum pedido selecionado para cancelamento.');
      return;
    }
    const pedidosNaoCancelados = this.pedidosParaCancelamento.filter(p => p.U_Status !== 'Cancelado');
    const allPedidosSelected = this.pedidosSelecionados.length === pedidosNaoCancelados.length;

    const message = allPedidosSelected
      ? 'Atenção: Remover todos os pedidos cancelará a ordem de carregamento e uma nova deverá ser criada.'
      : `Voce deseja Remover ${this.pedidosSelecionados.length} de pedidos?`;

    this.alertService.confirm(message).then(result => {
      if (result.isConfirmed) {
        this.executarCancelamento();
      }
    });
  }

  toggleSelecaoPedido(pedido: any, event: MouseEvent) {
    if (pedido.U_Status === 'Cancelado') {
      return;
    }
    pedido.selected = !pedido.selected;
    this.verificarSelecaoTotal();
    event.stopPropagation();
  }

  executarCancelamento() {
    this.loadingCancelamento = true;
    const docNumsParaCancelar = this.pedidosSelecionados.map(p => p.DocNum);
    this.ordemCarregamentoService.cancelarPedidos(this.selected.DocEntry, docNumsParaCancelar)
      .subscribe({
        next: (response) => {
          this.alertService.confirm('Pedidos cancelados com sucesso!');
          this.pedidos = this.pedidos.filter(pedido => !docNumsParaCancelar.includes(pedido.DocNum));
          this.pedidosParaCancelamento.forEach(pedido => {
            if (pedido.selected) {
              pedido.U_Status = 'Cancelado';
              pedido.selected = false;
            }
          });
          this.pedidosSelecionados = [];
          this.selectAllPedidos = false;
          this.filtrarPedidos();
        },
        error: (error) => {
          this.alertService.error('Erro ao cancelar pedidos: ' + error.message);
        },
        complete: () => {
          this.loadingCancelamento = false;
        }
      });
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

  abrirModalAdicionarPedidos() {
    if (this.selected.U_Status === 'Fechado' || this.selected.U_Status === 'Cancelado') {
      this.alertService.error('Não é possível adicionar pedidos a uma ordem fechada ou cancelada.');
      return;
    }
    this.showAdicionarPedidosModal = true;
    this.pedidosDisponiveis = [];
    this.pedidosDisponiveisFiltrados = [];
    this.pedidosSelecionadosAdicionar = [];
    this.selectAllDisponiveis = false;
    this.filtroPesquisaAdicionar = '';
    this.filtroDataInicial = '';
    this.filtroDataFinal = '';
    this.branchFiltro = null;
    this.localidadeFiltro = null;
    this.groupedPedidosDisponiveis = [];
  }

  fecharModalAdicionarPedidos() {
    this.showAdicionarPedidosModal = false;
  }

  selectBranchFiltro(branch: Branch) {
    this.branchFiltro = branch;
  }

  selectLocalidadeFiltro(localidade: Localidade) {
    this.localidadeFiltro = localidade;
  }

  isFiltroValido(): boolean {
    return !!this.branchFiltro && !!this.localidadeFiltro;
  }

  aplicarFiltros() {
    if (!this.isFiltroValido()) {
      this.alertService.error('Selecione uma filial e uma localidade para aplicar os filtros.');
      return;
    }
    this.loadingAdicionarPedidos = true;
    const startDate = this.filtroDataInicial || '';
    const endDate = this.filtroDataFinal || '';
    this.orderSalesService
      .search(startDate, endDate, this.branchFiltro.bplid, this.localidadeFiltro.Code)
      .subscribe({
        next: (result: NextLink<PedidoVenda>) => {
          this.pedidosDisponiveis = result.content.filter(
            pedido => !this.pedidos.some(p => p.DocEntry === pedido.DocEntry)
          );
          this.groupPedidosDisponiveis();
          this.pedidosDisponiveisFiltrados = [...this.pedidosDisponiveis];
          this.filtrarPedidosDisponiveis();
          this.loadingAdicionarPedidos = false;
        },
        error: (err) => {
          this.alertService.error('Erro ao buscar pedidos: ' + err.message);
          this.loadingAdicionarPedidos = false;
        }
      });
  }

  groupPedidosDisponiveis() {
    const grouped = this.pedidosDisponiveis.reduce((acc, pedido) => {
      const docNum = pedido.DocNum;
      if (!acc[docNum]) {
        acc[docNum] = {
          DocNum: docNum,
          CardName: pedido.CardName,
          items: [],
          isCollapsed: true,
          allSelected: false
        };
      }
      acc[docNum].items.push({ ...pedido, selected: false });
      return acc;
    }, {});
    this.groupedPedidosDisponiveis = Object.values(grouped);
  }

  filtrarPedidosDisponiveis() {
    if (!this.filtroPesquisaAdicionar) {
      this.pedidosDisponiveisFiltrados = [...this.pedidosDisponiveis];
      this.groupedPedidosDisponiveis = this.groupedPedidosDisponiveis.map(group => ({
        ...group,
        items: group.items.map(item => ({ ...item }))
      }));
    } else {
      const termo = this.filtroPesquisaAdicionar.toLowerCase().trim();
      this.pedidosDisponiveisFiltrados = this.pedidosDisponiveis.filter(pedido =>
        pedido.DocNum.toString().toLowerCase().includes(termo) ||
        pedido.CardName.toLowerCase().includes(termo) ||
        pedido.ItemCode.toLowerCase().includes(termo) ||
        pedido.Dscription.toLowerCase().includes(termo)
      );
      const filteredGrouped = this.pedidosDisponiveisFiltrados.reduce((acc, pedido) => {
        const docNum = pedido.DocNum;
        if (!acc[docNum]) {
          acc[docNum] = {
            DocNum: docNum,
            CardName: pedido.CardName,
            items: [],
            isCollapsed: true,
            allSelected: false
          };
        }
        acc[docNum].items.push({ ...pedido, selected: false });
        return acc;
      }, {});
      this.groupedPedidosDisponiveis = Object.values(filteredGrouped);
    }
    this.verificarSelecaoTotalDisponiveis();
  }

  limparFiltroAdicionar() {
    this.filtroPesquisaAdicionar = '';
    this.filtrarPedidosDisponiveis();
  }

  toggleSelectAllDisponiveis() {
    this.groupedPedidosDisponiveis.forEach(group => {
      group.allSelected = this.selectAllDisponiveis;
      group.items.forEach(item => {
        item.selected = this.selectAllDisponiveis;
      });
    });
    this.verificarSelecaoTotalDisponiveis();
  }

  toggleGroupSelect(group: any) {
    group.allSelected = !group.allSelected;
    group.items.forEach(item => {
      item.selected = group.allSelected;
    });
    this.verificarSelecaoTotalDisponiveis();
  }

  toggleSelecaoPedidoDisponivel(pedido: any, event: MouseEvent) {
    pedido.selected = !pedido.selected;
    const group = this.groupedPedidosDisponiveis.find(g => g.DocNum === pedido.DocNum);
    group.allSelected = group.items.every(item => item.selected);
    this.verificarSelecaoTotalDisponiveis();
    event.stopPropagation();
  }

  toggleCollapse(group: any) {
    group.isCollapsed = !group.isCollapsed;
  }

  verificarSelecaoTotalDisponiveis() {
    this.pedidosSelecionadosAdicionar = this.pedidosDisponiveisFiltrados.filter(p => p.selected);
    this.selectAllDisponiveis = this.pedidosDisponiveisFiltrados.length > 0 && 
                               this.pedidosDisponiveisFiltrados.every(p => p.selected);
    this.groupedPedidosDisponiveis.forEach(group => {
      group.allSelected = group.items.every(item => item.selected);
    });
  }

  confirmarAdicaoPedidos() {
    if (this.pedidosSelecionadosAdicionar.length === 0) {
      this.alertService.error('Nenhum pedido selecionado para adicionar.');
      return;
    }
    const pedidosNumeros = this.pedidosSelecionadosAdicionar.map(p => p.DocNum).join(', ');
    this.alertService.confirm(
      `Tem certeza que deseja adicionar ${this.pedidosSelecionadosAdicionar.length} item(s) a esta ordem?<br>
      <strong>Pedidos: ${pedidosNumeros}</strong>`
    ).then(result => {
      if (result.isConfirmed) {
        this.executarAdicaoPedidos();
      }
    });
  }

  executarAdicaoPedidos() {
    this.loadingAdicionarPedidos = true;
    const docNumsParaAdicionar = [...new Set(this.pedidosSelecionadosAdicionar.map(p => p.DocNum))];
    const updateRequests = docNumsParaAdicionar.map(docNum => {
      return this.orderSalesService.updateOrdemCarregamento(docNum.toString(), this.selected.DocEntry);
    });
    forkJoin(updateRequests).subscribe({
      next: () => {
        this.alertService.confirm('Pedidos adicionados com sucesso!');
        this.pedidos = [...this.pedidos, ...this.pedidosSelecionadosAdicionar];
        this.showAdicionarPedidosModal = false;
        this.pedidosSelecionadosAdicionar = [];
        this.groupedPedidosDisponiveis = [];
      },
      error: (err) => {
        this.alertService.error('Erro ao adicionar pedidos: ' + err.message);
        this.loadingAdicionarPedidos = false;
      },
      complete: () => {
        this.loadingAdicionarPedidos = false;
      }
    });
  }

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