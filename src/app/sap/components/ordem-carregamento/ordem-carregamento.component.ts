import { Component, OnInit, ViewChild } from '@angular/core';
import { Branch } from '../../model/branch';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PedidoVenda } from '../document/documento.statement.component';
import { OrderSalesService } from '../../service/document/order-sales.service';
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
  isOn = false;
  branchId: string;
  selectedBranch: Branch;
  localidadeId: number;
  selectedLocalidade: BusinessPartner;

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

  // Check if all required filter fields are filled
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
            this.originList = pedidos || []; // Ensure array
          },
          error: (err) => {
            console.error('Error fetching pedidos:', err);
            this.originList = []; // Clear on error
          }
        });
    } else {
      console.warn('Please fill all filters');
      this.originList = []; // Clear if filters are incomplete
    }
  }

  consultarEstoque() {
    this.previewModal.openModal();
  }

  getOriginList(): PedidoVenda[] {
    return this.originList;
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
    console.log('Creating ordem de carregamento:', this.nomeOrdemCarregamento, this.originList);
  }
}