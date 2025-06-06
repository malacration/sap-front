import { Component, OnInit } from '@angular/core';
import { SalesPersonService } from '../../service/sales-person.service';
import { AlertService } from '../../service/alert.service';
import { Router } from '@angular/router';
import { Branch } from '../../model/branch';
import { Localidade } from '../../model/localidade/localidade';
import { LocalidadeService } from '../../service/localidade.service';
import { OrderSalesService } from '../../service/document/order-sales.service';
import { PedidoVenda } from '../document/documento.statement.component';

@Component({
  selector: 'app-ordem-carregamento',
  templateUrl: './ordem-carregamento.component.html',
  styleUrls: ['./ordem-carregamento.component.scss']
})
export class OrdemCarregamentoComponent implements OnInit {
  nameOrdInput: string;
  dtInicial: string;
  dtFinal: string;
  branchId: string;
  selectedBranch: Branch = null;
  localidade: Localidade = null;
  loading = false;
  showStock: boolean = false;
  
  // Para a dual list box
  availableOrders: PedidoVenda[] = [];
  selectedOrders: PedidoVenda[] = [];

  constructor(
    private localidadeService: LocalidadeService,
    private alertService: AlertService,
    private router: Router,
    private orderSalesService: OrderSalesService
  ) {}

  ngOnInit(): void {}

  selectBranch(branch: Branch) {
    this.branchId = branch.bplid;
    this.selectedBranch = branch; 
  }

  selectLocalidade($event) {
    this.localidade = $event;
    this.localidadeService.get(this.localidade.Code).subscribe(it => {
      this.localidade = it;
    });
  }

  criarAnalise() {
    if (!this.isnotNullFiltrar()) {
      this.alertService.error('Preencha todos os campos obrigatórios');
      return;
    }

    this.orderSalesService.search({
      dataInicial: this.dtInicial,
      dataFinal: this.dtFinal,
      branchId: this.branchId,
      localidade: this.localidade.Code
    }).subscribe({
      next: (result) => {
        this.availableOrders = result.content;
        this.selectedOrders = [];
      },
      error: (err) => {
        this.alertService.error('Erro ao buscar pedidos');
      }
    });
  }

  isnotNullFiltrar() {
    return this.branchId && this.localidade;
  }

  onSelectedOrdersChange(orders: PedidoVenda[]) {
    this.selectedOrders = orders;
  }

  clearDataInicial() {
    this.dtInicial = null;
  }

  clearDataFinal() {
    this.dtFinal = null;
  }

  toggleEstoque() {
    this.showStock = !this.showStock;
  }

  sendOrder() {}
}