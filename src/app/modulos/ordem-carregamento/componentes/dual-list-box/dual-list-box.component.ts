import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { PedidoVenda } from '../../../../sap/model/document/pedido-venda.model';
import { AlertService } from '../../../../shared/service/alert.service';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';
import { chaveDocumento, isFaturaReserva } from '../../models/fatura-reserva';

type Grupo = { key: string; docNum: number; fatura: boolean; items: PedidoVenda[]; totalFrete: number };

@Component({
  selector: 'app-dual-list-box',
  templateUrl: './dual-list-box.component.html',
  styleUrls: ['./dual-list-box.component.scss']
})
export class DualListBoxComponent {
  @Input() availableItems: PedidoVenda[] = [];
  @Input() selectedItems: PedidoVenda[] = [];
  @Input() showStock: boolean = false;
  // Ha mais pagina de pedidos ou de NF de venda futura: mostra "Carregar Mais".
  @Input() temMais: boolean = false;
  @Input() isLoadingOrders: boolean = false;
  @Output() selectedItemsChange = new EventEmitter<PedidoVenda[]>();
  // Devolve ao formulario a lista de disponiveis depois de mover itens: o "Carregar Mais" parte dela.
  @Output() availableItemsChange = new EventEmitter<PedidoVenda[]>();
  @Output() loadMore = new EventEmitter<void>();

  quantidadesEmCarregamento: { [itemCode: string]: number } = {};
  carregandoEstoque = false;
  searchTermAvailable: string = '';
  searchTermSelected: string = '';
  carregamentoPorPedido: boolean = true;
  isSelectedListCollapsed: boolean = false;

  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // So ao ligar o estoque ou chegar busca nova; mover item entre as listas nao recarrega.
    // A lista que volta pelo availableItemsChange nao e busca nova.
    const buscaNova = changes['availableItems'] && changes['availableItems'].currentValue !== this.disponiveisEmitidos;
    const mudou = changes['showStock'] || buscaNova;
    if (mudou && this.showStock && this.availableItems.length > 0) {
      this.loadQuantidadesEmCarregamento();
    }
  }
  
  // Opcional; gravado na ordem (U_capacidadeCaminhao).
  @Input() capacidadeKg: number | null = null;
  @Output() capacidadeKgChange = new EventEmitter<number | null>();

  balanco(item: PedidoVenda): number {
    return Number(item.OnHand || 0) - (this.quantidadesEmCarregamento[item.ItemCode] ?? 0);
  }

  get ocupacao(): number {
    return this.capacidadeKg > 0 ? Math.round(this.totalSelectedWeight / this.capacidadeKg * 100) : 0;
  }

  get totalSelectedWeight(): number {
    return this.selectedItems.reduce(
      (sum, item) => sum + (Number(item.Weight1) || 0),
      0
    );
  }

  get availableOrdersCount(): number {
    return new Set(this.availableItems.map(chaveDocumento)).size;
  }

  get selectedOrdersCount(): number {
    return new Set(this.selectedItems.map(chaveDocumento)).size;
  }

  get groupedAvailableItems(): Grupo[] {
    return this.groupItems(this.availableItems, this.searchTermAvailable);
  }

  get groupedSelectedItems(): Grupo[] {
    return this.groupItems(this.selectedItems, this.searchTermSelected);
  }

  get totalSelectedFrete(): number {
    return this.selectedItems.reduce((sum, item) => sum + (Number(item.DistribSum) || 0), 0);
  }

  selectGroup(group: Grupo): void {
    const itemsToMove = [...group.items];
    this.selectedItems = this.sortItems([...this.selectedItems, ...itemsToMove]);
    this.atualizarDisponiveis(this.availableItems.filter(i => chaveDocumento(i) !== group.key));
    this.selectedItemsChange.emit(this.selectedItems);
  }

  trackByDocNum(index: number, group: Grupo) {
    return group.key;
  }

  trackByItem(index: number, item: PedidoVenda) {
    return `${chaveDocumento(item)}-${item.ItemCode}-${item.BaseLine}`;
  }

  removeGroup(group: Grupo): void {
    const itemsToMove = [...group.items];
    itemsToMove.forEach(i => this.restaurarSaldo(i));
    this.atualizarDisponiveis(this.sortItems([...this.availableItems, ...itemsToMove]));
    this.selectedItems = this.selectedItems.filter(i => chaveDocumento(i) !== group.key);
    this.selectedItemsChange.emit(this.selectedItems);
  }

  isFaturaReserva(item: PedidoVenda): boolean {
    return isFaturaReserva(item);
  }

  // NF de venda futura sai aos poucos: a quantidade da linha selecionada e a retirada desta ordem,
  // limitada ao SaldoFatura que vem do backend. Peso acompanha a quantidade.
  alterarRetirada(item: PedidoVenda, valor: any): void {
    const pesoUnitario = this.pesoUnitario(item);
    const saldo = item.SaldoFatura ?? Number(item.Quantity);
    let quantidade = Math.max(0, Number(valor) || 0);
    if (quantidade > saldo) {
      quantidade = saldo;
      this.alertService.error(`Saldo da NF de venda futura para ${item.ItemCode} é ${saldo}.`);
    }
    const freteUnitario = this.freteUnitario(item);
    item.Quantity = quantidade;
    item.Weight1 = quantidade * pesoUnitario;
    item.DistribSum = this.freteDe(item, quantidade, freteUnitario);
    this.selectedItemsChange.emit(this.selectedItems);
  }

  private pesoUnitario(item: PedidoVenda): number {
    item.pesoUnitario ??= Number(item.Quantity) ? Number(item.Weight1) / Number(item.Quantity) : 0;
    return item.pesoUnitario;
  }

  // Frete da NF de venda futura e proporcional a quantidade retirada (vem calculado do backend).
  private freteUnitario(item: PedidoVenda): number {
    //Do backend, sem arredondar; dividir o DistribSum (em centavos) zeraria frete pequeno.
    item.freteUnitario ??= item.FreteUnitario ?? (Number(item.Quantity) ? Number(item.DistribSum || 0) / Number(item.Quantity) : 0);
    return item.freteUnitario;
  }

  // Mesmo teto da entrega: o frete da retirada nunca passa do que resta do frete da NF.
  private freteDe(item: PedidoVenda, quantidade: number, freteUnitario: number): number {
    const teto = item.FreteRestante ?? Number.POSITIVE_INFINITY;
    return Math.round(Math.min(quantidade * freteUnitario, teto) * 100) / 100;
  }

  private restaurarSaldo(item: PedidoVenda): void {
    if (isFaturaReserva(item) && item.SaldoFatura != null) {
      const pesoUnitario = this.pesoUnitario(item);
      const freteUnitario = this.freteUnitario(item);
      item.Quantity = item.SaldoFatura;
      item.Weight1 = item.SaldoFatura * pesoUnitario;
      item.DistribSum = this.freteDe(item, item.SaldoFatura, freteUnitario);
    }
  }

  private groupItems(items: PedidoVenda[], searchTerm: string): Grupo[] {
    const grouped = items.reduce((acc, item) => {
      const key = chaveDocumento(item);
      if (!acc[key]) {
        acc[key] = { key, docNum: item.DocNum, fatura: isFaturaReserva(item), items: [], totalFrete: 0 };
      }
      acc[key].items.push(item);
      acc[key].totalFrete += Number(item.DistribSum) || 0;
      return acc;
    }, {} as { [key: string]: Grupo });

    const termo = this.semAcento(searchTerm);
    return Object.values(grouped)
      .filter(group => group.items.some(item =>
        this.semAcento(`${group.docNum} ${item.CardCode || ''} ${item.CardName || ''} ${item.SlpName || ''} ${item.Name || ''} ${item.ItemCode || ''} ${item.Dscription || ''}`)
          .includes(termo)
      ))
      .sort((a, b) => a.docNum - b.docNum);
  }

  private semAcento(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private disponiveisEmitidos: PedidoVenda[] | null = null;

  private atualizarDisponiveis(itens: PedidoVenda[]): void {
    this.availableItems = itens;
    this.disponiveisEmitidos = itens;
    this.availableItemsChange.emit(itens);
  }

  private sortItems(items: PedidoVenda[]): PedidoVenda[] {
    return items.sort((a, b) => a.DocNum - b.DocNum || a.ItemCode.localeCompare(b.ItemCode));
  }

  selectItem(item: PedidoVenda): void {
    const itemsToMove = this.carregamentoPorPedido
      ? this.availableItems.filter(i => chaveDocumento(i) == chaveDocumento(item))
      : [item];
    this.selectedItems = this.sortItems([...this.selectedItems, ...itemsToMove]);
    this.atualizarDisponiveis(this.sortItems(this.availableItems.filter(i => !itemsToMove.includes(i))));
    this.selectedItemsChange.emit(this.selectedItems);
  }

  removeItem(item: PedidoVenda): void {
    const itemsToRemove = this.carregamentoPorPedido
      ? this.selectedItems.filter(i => chaveDocumento(i) == chaveDocumento(item))
      : [item];
    itemsToRemove.forEach(i => this.restaurarSaldo(i));
    this.atualizarDisponiveis(this.sortItems([...this.availableItems, ...itemsToRemove]));
    this.selectedItems = this.sortItems(this.selectedItems.filter(i => !itemsToRemove.includes(i)));
    this.selectedItemsChange.emit(this.selectedItems);
  }

  selectAll(): void {
    this.selectedItems = this.sortItems([...this.selectedItems, ...this.availableItems]);
    this.atualizarDisponiveis([]);
    this.selectedItemsChange.emit(this.selectedItems);
  }

  removeAll(): void {
    this.alertService.confirm('Deseja realmente remover todos os itens selecionados?').then(result => {
      if (result.isConfirmed) {
        this.selectedItems.forEach(i => this.restaurarSaldo(i));
        this.atualizarDisponiveis(this.sortItems([...this.availableItems, ...this.selectedItems]));
        this.selectedItems = [];
        this.selectedItemsChange.emit(this.selectedItems);
      }
    });
  }

  toggleSelectedList(): void {
    this.isSelectedListCollapsed = !this.isSelectedListCollapsed;
  }

  loadMoreOrders(): void {
    this.loadMore.emit();
  }

  // Uma consulta traz todos os itens das ordens Abertas (antes era uma chamada por item).
  private loadQuantidadesEmCarregamento(): void {
    if (this.carregandoEstoque) {
      return;
    }
    this.carregandoEstoque = true;
    this.ordemCarregamentoService.getEstoqueEmCarregamentoItens().subscribe({
      next: (porItem) => {
        this.quantidadesEmCarregamento = porItem;
        this.carregandoEstoque = false;
      },
      error: () => {
        this.alertService.error('Erro ao carregar o estoque em carregamento.');
        this.carregandoEstoque = false;
      }
    });
  }


}
