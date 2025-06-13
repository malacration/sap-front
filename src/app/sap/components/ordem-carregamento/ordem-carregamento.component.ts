import { Component, OnInit } from '@angular/core';
import { SalesPersonService } from '../../service/sales-person.service';
import { Observable, forkJoin } from 'rxjs';
import { AlertService } from '../../service/alert.service';
import { Router } from '@angular/router';
import { Branch } from '../../model/branch';
import { Localidade } from '../../model/localidade/localidade';
import { LocalidadeService } from '../../service/localidade.service';
import { OrderSalesService } from '../../service/document/order-sales.service';
import { PedidoVenda } from '../document/documento.statement.component';
import { LinhaItem, OrdemCarregamento } from '../../model/ordem-carregamento';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';

@Component({
  selector: 'app-ordem-carregamento',
  templateUrl: './ordem-carregamento.component.html',
  styleUrls: ['./ordem-carregamento.component.scss']
})
export class OrdemCarregamentoComponent implements OnInit {
  nameOrdInput: string = '';
  dtInicial: string;
  dtFinal: string;
  branchId: string;
  selectedBranch: Branch = null;
  localidade: Localidade = null;
  loading = false;
  showStock: boolean = false;
  isNameManuallyEdited: boolean = false; // Flag to track manual edits

  // Para a dual list box
  availableOrders: PedidoVenda[] = [];
  selectedOrders: PedidoVenda[] = [];

  constructor(
    private localidadeService: LocalidadeService,
    private alertService: AlertService,
    private router: Router,
    private orderSalesService: OrderSalesService,
    private ordemCarregamentoService: OrdemCarregamentoService
  ) {}

  ngOnInit(): void {}

  selectBranch(branch: Branch) {
    this.branchId = branch.bplid;
    this.selectedBranch = branch;
    this.updateOrderName();
  }

  selectLocalidade($event) {
    this.localidade = $event;
    this.localidadeService.get(this.localidade.Code).subscribe(it => {
      this.localidade = it;
      this.updateOrderName();
    });
  }

  // Update the order name only if it hasn't been manually edited
  updateOrderName() {
    if (!this.isNameManuallyEdited && this.selectedBranch && this.localidade) {
      const nomeFilial = this.selectedBranch?.bplname || 'Filial'; // Replace with actual branch name property
      const rotaName = this.localidade?.Name || 'Localidade'; // Replace with actual locality name property
      this.nameOrdInput = `${nomeFilial} Com Destino: ${rotaName}`;
    }
  }

  // Handle manual changes to the input field
  onNameInputChange() {
    this.isNameManuallyEdited = true; // Mark as manually edited
  }

  criarAnalise(): void {
    if (!this.isnotNullFiltrar()) {
      this.alertService.error('Preencha todos os campos obrigatórios');
      return;
    }

    const startDate = this.dtInicial || '';
    const endDate = this.dtFinal || '';

    this.orderSalesService
      .search(startDate, endDate, this.branchId, this.localidade.Code)
      .subscribe({
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

  sendOrder() {
    if (!this.nameOrdInput || this.selectedOrders.length === 0) {
      this.alertService.error('Preencha o nome da ordem e selecione pelo menos um pedido');
      return;
    }

    console.log('Selected Orders:', this.selectedOrders);
    console.log('ORD_CRG_LINHA:', this.selectedOrders.map((pedido, index) => ({
      U_orderDocEntry: pedido.DocEntry,
      U_docNumPedido: pedido.DocNum,
      U_cardCode: pedido.CardCode,
      U_cardName: pedido.CardName,
      U_quantidade: pedido.Quantity,
      DocEntry: 0,
      LineId: index,
      VisOrder: index
    })));

    this.loading = true;
    const requests: Observable<any>[] = [];

    const ordemCarregamento = new OrdemCarregamento();
    ordemCarregamento.U_nameOrdem = this.nameOrdInput;
    ordemCarregamento.U_Status = 'Aberto';
    ordemCarregamento.U_pesoTotal = this.calcularPesoTotal();
    ordemCarregamento.ORD_CRG_LINHACollection = this.selectedOrders.map((pedido, index) => {
      const linha = new LinhaItem();
      linha.U_orderDocEntry = pedido.DocEntry;
      linha.U_docNumPedido = pedido.DocNum;
      linha.U_cardCode = pedido.CardCode;
      linha.U_cardName = pedido.CardName;
      linha.U_quantidade = pedido.Quantity;
      linha.DocEntry = 0;
      linha.LineId = index;
      linha.VisOrder = index;
      linha.U_pesoItem = pedido.Weight1;
      return linha;
    });

    console.log('OrdemCarregamento:', ordemCarregamento);

    requests.push(this.ordemCarregamentoService.save(ordemCarregamento));

    forkJoin(requests).subscribe({
      next: () => {
        this.concluirEnvio();
      },
      error: (err) => {
        this.loading = false;
        this.alertService.error('Erro ao enviar ordem de carregamento');
        console.error(err);
      }
    });
  }

  calcularPesoTotal(): number {
    return this.selectedOrders.reduce((total, pedido) => {
      return total + (pedido.Weight1 || 0) * (pedido.Quantity || 1);
    }, 0);
  }

  concluirEnvio() {
    this.alertService.info('Seu pedido foi Enviado').then(() => {
      this.loading = false;
      this.limparFormulario();
    });
  }

  limparFormulario() {
    this.router.navigateByUrl('/RefreshComponent', { skipLocationChange: true }).then(() => {
      this.router.navigate(['venda/cotacao']);
    });
  }
}