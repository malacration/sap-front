import { Component, OnInit, ViewChild } from '@angular/core';
import { Branch } from '../../model/branch';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PedidoVenda } from '../document/documento.statement.component';
import { FaturasService } from '../../service/fatura/faturas.service';

@Component({
  selector: 'app-ordem-carregamento',
  templateUrl: './ordem-carregamento.component.html',
  styleUrls: ['./ordem-carregamento.component.scss']
})
export class OrdemCarregamentoComponent implements OnInit {
  constructor(private orderSalesService: FaturasService) {}

  ngOnInit(): void {}

  nomeOrdemCarregamento: string = '';
  dataInicial: string;
  dataFinal: string;
  originList: PedidoVenda[] = [];
  destinationList: PedidoVenda[] = [];
  originalOrder: PedidoVenda[] = [];
  isOn = false;
  branchId: string;
  selectedBranch: Branch;
  localidadeId: number;
  selectedLocalidade: BusinessPartner;
  isDestinationMinimized: boolean = false;

  @ViewChild('previewModal', { static: true }) previewModal: ModalComponent;

  toggle() {
    this.isOn = !this.isOn;
  }

  limparDataInicial() {
    this.dataInicial = null;
  }

  limparDataFinal() {
    this.dataFinal = null;
  }

  selectBranch(branch: Branch) {
    this.branchId = branch.bplid;
    this.selectedBranch = branch;
  }

  selectLocalidade(bp: BusinessPartner) {
    this.localidadeId = bp.U_Localidade;
    this.selectedLocalidade = bp;
  }

  isFilterValid(): boolean {
    return !!(
      this.dataInicial &&
      this.dataFinal &&
      this.selectedBranch &&
      this.selectedLocalidade
    );
  }

  filtrarPedidos() {
    if (this.isFilterValid()) {
      this.orderSalesService
        .getPedidos(this.dataInicial, this.dataFinal, this.branchId, this.localidadeId)
        .subscribe({
          next: (pedidos) => {
            this.originList = this.sortPedidos(pedidos || []);
            this.originalOrder = [...this.originList];
            this.destinationList = [];
          },
          error: (err) => {
            console.error('Error fetching pedidos:', err);
            this.originList = [];
            this.originalOrder = [];
            this.destinationList = [];
          }
        });
    } else {
      console.warn('Please fill all filters');
      this.originList = [];
      this.originalOrder = [];
      this.destinationList = [];
    }
  }

  private sortPedidos(pedidos: PedidoVenda[]): PedidoVenda[] {
    return pedidos.sort((a, b) => {
      const docNumA = String(a.DocNum ?? '');
      const docNumB = String(b.DocNum ?? '');
      const docNumCompare = docNumA.localeCompare(docNumB);
      if (docNumCompare !== 0) return docNumCompare;

      const cardCodeA = String(a.CardCode ?? '');
      const cardCodeB = String(b.CardCode ?? '');
      return cardCodeA.localeCompare(cardCodeB);
    });
  }

  getGroupedOriginList(): { docNum: string, items: PedidoVenda[] }[] {
    const grouped = this.originList.reduce((acc, pedido) => {
      const key = String(pedido.DocNum ?? 'unknown');
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(pedido);
      return acc;
    }, {} as { [key: string]: PedidoVenda[] });

    return Object.keys(grouped)
      .sort()
      .map(docNum => ({
        docNum,
        items: grouped[docNum]
      }));
  }

  getGroupedDestinationList(): { docNum: string, items: PedidoVenda[] }[] {
    const grouped = this.destinationList.reduce((acc, pedido) => {
      const key = String(pedido.DocNum ?? 'unknown');
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(pedido);
      return acc;
    }, {} as { [key: string]: PedidoVenda[] });

    return Object.keys(grouped)
      .sort()
      .map(docNum => ({
        docNum,
        items: grouped[docNum]
      }));
  }

  consultarEstoque() {
    this.previewModal.openModal();
  }

  moveToDestination(pedido: PedidoVenda) {
    this.originList = this.originList.filter(item => item !== pedido);
    this.destinationList = [...this.destinationList, pedido];
  }

  moveToOrigin(pedido: PedidoVenda) {
    this.destinationList = this.destinationList.filter(item => item !== pedido);

    const originalIndex = this.originalOrder.findIndex(
      item => item === pedido || (
        item.DocNum === pedido.DocNum &&
        item.CardCode === pedido.CardCode &&
        item.CardName === pedido.CardName &&
        item.BuyUnitMsr === pedido.BuyUnitMsr
      )
    );

    if (originalIndex >= 0) {
      let insertIndex = 0;
      for (let i = 0; i < this.originList.length; i++) {
        const currentOriginalIndex = this.originalOrder.findIndex(
          item => item === this.originList[i]
        );
        if (currentOriginalIndex > originalIndex) {
          break;
        }
        insertIndex = i + 1;
      }
      this.originList = [
        ...this.originList.slice(0, insertIndex),
        pedido,
        ...this.originList.slice(insertIndex)
      ];
    } else {
      this.originList = [...this.originList, pedido];
    }
  }

  filterList(list: any[], search: string): any[] {
    if (!search) {
      return list;
    }
    return list.filter((item) =>
      item.CardName.toLowerCase().includes(search.toLowerCase())
    );
  }

  sendOrder() {
    console.log('Creating ordem de carregamento:', {
      nome: this.nomeOrdemCarregamento,
      origin: this.originList,
      destination: this.destinationList
    });
  }

  toggleDestinationMinimize() {
    this.isDestinationMinimized = !this.isDestinationMinimized;
  }

  calculateTotalWeight(): number {
    return this.destinationList.reduce((total, pedido) => {
      return total + (pedido.Weight || 0);
    }, 0);
  }
}