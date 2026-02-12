import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';
import { BatchStockService } from '../../../../modulos/sap-shared/_services/BatchStockService';
import { AlertService } from '../../../../shared/service/alert.service';

export interface PedidoXItem {
  itemId: string;
  itemCode: string;
  descricao: string;
  quantidade: number;
  deposito: string;
  lotesSelecionados: BatchStock[];
}

export interface PedidoX {
  pedidoId: string;
  docEntry: number;
  docNum: number;
  cardCode: string;
  cardName: string;
  itens: PedidoXItem[];
}

interface LoteEdicao extends BatchStock {
  quantidadeDisponivel: number;
  quantidadeSelecionada: number;
}

@Component({
  selector: 'app-selecao-lotes-modal-pedido',
  templateUrl: './selecao-lotes-modal-pedido.component.html',
  styleUrls: ['./selecao-lotes-modal-pedido.component.scss']
})
export class SelecaoLotesModalPedidoComponent implements OnChanges {
  @Input() show: boolean = false;
  @Input() pedidosX: PedidoX[] = [];
  @Input() loading: boolean = false;

  @Output() showChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<PedidoX[]>();

  pedidosAuxiliares: PedidoX[] = [];
  currentPedido: PedidoX | null = null;
  currentItem: PedidoXItem | null = null;
  lotesEmEdicao: LoteEdicao[] = [];
  loadingLotes: boolean = false;

  private lotesOriginaisPorItemDeposito = new Map<string, BatchStock[]>();
  private consumoGlobalPorLote = new Map<string, number>();

  constructor(
    private batchStockService: BatchStockService,
    private alertService: AlertService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['pedidosX'] || changes['show']) && this.show) {
      this.inicializarEstruturaAuxiliar();
    }
  }

  selecionarPedido(pedido: PedidoX): void {
    this.currentPedido = pedido;
    this.currentItem = null;
    this.lotesEmEdicao = [];
  }

  selecionarItem(item: PedidoXItem): void {
    this.currentItem = item;
    this.carregarLotesParaItem(item);
  }

  confirmarItem(): void {
    if (!this.currentItem || this.quantidadeRestanteItem() !== 0) {
      return;
    }

    this.removerConsumoGlobal(this.currentItem.lotesSelecionados);

    const novosLotesSelecionados = this.lotesEmEdicao
      .filter(lote => lote.quantidadeSelecionada > 0)
      .map(lote => {
        const quantidade = Number(lote.quantidadeSelecionada) || 0;
        return Object.assign(new BatchStock(), lote, {
          Quantity: quantidade,
          quantitySelecionadaEditable: quantidade
        });
      });

    this.adicionarConsumoGlobal(novosLotesSelecionados);
    this.currentItem.lotesSelecionados = novosLotesSelecionados;
    this.recalcularDisponibilidadeEmEdicao();
  }

  confirmar(): void {
    if (!this.todosPedidosCompletos()) {
      return;
    }

    this.confirm.emit(this.pedidosAuxiliares);
  }

  close(): void {
    this.showChange.emit(false);
    this.currentPedido = null;
    this.currentItem = null;
    this.lotesEmEdicao = [];
  }

  quantidadeSelecionadaItem(item: PedidoXItem): number {
    return item.lotesSelecionados.reduce((acc, lote) => acc + (Number(lote.Quantity) || 0), 0);
  }

  quantidadeRestanteItem(): number {
    if (!this.currentItem) {
      return 0;
    }

    return (Number(this.currentItem.quantidade) || 0) - this.totalSelecionadoEmEdicao();
  }

  totalSelecionadoEmEdicao(): number {
    return this.lotesEmEdicao.reduce((acc, lote) => acc + (Number(lote.quantidadeSelecionada) || 0), 0);
  }

  itensCompletosDoPedido(pedido: PedidoX): number {
    return pedido.itens.filter(item => this.quantidadeSelecionadaItem(item) === (Number(item.quantidade) || 0)).length;
  }

  pedidoCompleto(pedido: PedidoX): boolean {
    return pedido.itens.length > 0 && this.itensCompletosDoPedido(pedido) === pedido.itens.length;
  }

  todosPedidosCompletos(): boolean {
    return this.pedidosAuxiliares.length > 0 && this.pedidosAuxiliares.every(pedido => this.pedidoCompleto(pedido));
  }

  onQuantidadeLoteChange(lote: LoteEdicao): void {
    if (!lote) {
      return;
    }

    const valor = Number(lote.quantidadeSelecionada) || 0;
    if (valor < 0) {
      lote.quantidadeSelecionada = 0;
      return;
    }

    if (valor > lote.quantidadeDisponivel) {
      lote.quantidadeSelecionada = lote.quantidadeDisponivel;
    }
  }

  private inicializarEstruturaAuxiliar(): void {
    this.pedidosAuxiliares = this.pedidosX.map(pedido => ({
      ...pedido,
      itens: (pedido.itens || []).map(item => ({
        ...item,
        lotesSelecionados: (item.lotesSelecionados || []).map(lote =>
          Object.assign(new BatchStock(), lote)
        )
      }))
    }));

    this.consumoGlobalPorLote.clear();
    this.pedidosAuxiliares.forEach(pedido =>
      pedido.itens.forEach(item => this.adicionarConsumoGlobal(item.lotesSelecionados))
    );

    this.currentPedido = this.pedidosAuxiliares[0] || null;
    this.currentItem = null;
    this.lotesEmEdicao = [];
  }

  private carregarLotesParaItem(item: PedidoXItem): void {
    const chave = this.getItemDepositoKey(item.itemCode, item.deposito);
    const lotesCache = this.lotesOriginaisPorItemDeposito.get(chave);

    if (lotesCache) {
      this.montarLotesEmEdicao(item, lotesCache);
      return;
    }

    this.loadingLotes = true;
    this.batchStockService.get(item.itemCode, item.deposito).subscribe({
      next: (lotes) => {
        this.lotesOriginaisPorItemDeposito.set(chave, lotes || []);
        this.montarLotesEmEdicao(item, lotes || []);
        this.loadingLotes = false;
      },
      error: (error) => {
        this.alertService.error('Erro ao carregar lotes: ' + (error.error?.message || error.message));
        this.loadingLotes = false;
      }
    });
  }

  private montarLotesEmEdicao(item: PedidoXItem, lotesOriginais: BatchStock[]): void {
    const consumoDoItem = new Map<string, number>();
    item.lotesSelecionados.forEach(lote => {
      const chaveLote = this.getLoteKey(item.itemCode, lote.WhsCode || item.deposito, lote.DistNumber);
      const atual = consumoDoItem.get(chaveLote) || 0;
      consumoDoItem.set(chaveLote, atual + (Number(lote.Quantity) || 0));
    });

    this.lotesEmEdicao = lotesOriginais.map(loteOriginal => {
      const chaveLote = this.getLoteKey(item.itemCode, loteOriginal.WhsCode || item.deposito, loteOriginal.DistNumber);
      const consumoGlobal = this.consumoGlobalPorLote.get(chaveLote) || 0;
      const consumoDoItemAtual = consumoDoItem.get(chaveLote) || 0;
      const quantidadeDisponivel = Math.max(
        0,
        (Number(loteOriginal.Quantity) || 0) - (consumoGlobal - consumoDoItemAtual)
      );

      return Object.assign(new BatchStock(), loteOriginal, {
        quantidadeDisponivel,
        quantidadeSelecionada: consumoDoItemAtual
      });
    });
  }

  private recalcularDisponibilidadeEmEdicao(): void {
    if (!this.currentItem) {
      return;
    }

    this.montarLotesEmEdicao(this.currentItem, this.lotesEmEdicao);
  }

  private adicionarConsumoGlobal(lotes: BatchStock[]): void {
    (lotes || []).forEach(lote => {
      const chaveLote = this.getLoteKey(lote.ItemCode, lote.WhsCode, lote.DistNumber);
      const consumoAtual = this.consumoGlobalPorLote.get(chaveLote) || 0;
      this.consumoGlobalPorLote.set(chaveLote, consumoAtual + (Number(lote.Quantity) || 0));
    });
  }

  private removerConsumoGlobal(lotes: BatchStock[]): void {
    (lotes || []).forEach(lote => {
      const chaveLote = this.getLoteKey(lote.ItemCode, lote.WhsCode, lote.DistNumber);
      const consumoAtual = this.consumoGlobalPorLote.get(chaveLote) || 0;
      const novoConsumo = consumoAtual - (Number(lote.Quantity) || 0);
      if (novoConsumo <= 0) {
        this.consumoGlobalPorLote.delete(chaveLote);
      } else {
        this.consumoGlobalPorLote.set(chaveLote, novoConsumo);
      }
    });
  }

  private getItemDepositoKey(itemCode: string, deposito: string): string {
    return `${itemCode || ''}@@${deposito || ''}`;
  }

  private getLoteKey(itemCode: string, deposito: string, distNumber: string): string {
    return `${itemCode || ''}@@${deposito || ''}@@${distNumber || ''}`;
  }
}
