import { Component, OnInit } from '@angular/core';
import { SalesPersonService } from '../../service/sales-person.service';
import { forkJoin, Observable } from 'rxjs';
import { AlertService } from '../../service/alert.service';
import { Router } from '@angular/router';
import { Branch } from '../../model/branch';
import { Localidade } from '../../model/localidade/localidade';
import { OrderSalesService } from '../../service/document/order-sales.service';
import { PedidoVenda } from '../document/documento.statement.component';
import { LocalidadeService } from '../../service/localidade.service';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';
import { NextLink } from '../../model/next-link';
import { OrdemCarregamento } from '../../model/ordem-carregamento';

@Component({
  selector: 'app-ordem-carregamento',
  templateUrl: './ordem-carregamento.component.html',
  styleUrls: ['./ordem-carregamento.component.scss']
})
export class OrdemCarregamentoComponent implements OnInit {
  nameOrdInput: string = '';
  dtInicial: string;
  dtFinal: string;
  branchId: string = "11";
  selectedBranch: Branch = null;
  localidade: Localidade = null;
  showStock: boolean = false;
  isNameManuallyEdited: boolean = false;
  availableOrders: PedidoVenda[] = [];
  selectedOrders: PedidoVenda[] = [];
  nextLink: string = '';
  private previousBranchId: string = null;
  private previousLocalidadeCode: string = null;
  loading = false

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

  updateOrderName() {
    if (!this.isNameManuallyEdited && this.selectedBranch && this.localidade) {
      const nomeFilial = this.selectedBranch?.bplname || 'Filial';
      const rotaName = this.localidade?.Name || 'Localidade';
      this.nameOrdInput = `${nomeFilial} Com Destino: ${rotaName}`;
    }
  }

  onNameInputChange() {
    this.isNameManuallyEdited = true;
  }

  criarAnalise(): void {
    if (!this.isnotNullFiltrar()) {
      this.alertService.error('Preencha todos os campos obrigatórios');
      return;
    }

    const branchChanged = this.previousBranchId !== this.branchId;
    this.previousBranchId = this.branchId;
    this.previousLocalidadeCode = this.localidade.Code;

    const startDate = this.dtInicial || '';
    const endDate = this.dtFinal || '';

    this.orderSalesService
      .search(startDate, endDate, this.branchId, this.localidade.Code)
      .subscribe({
        next: (result: NextLink<PedidoVenda>) => {
          this.availableOrders = result.content;
          this.nextLink = result.nextLink;
          this.availableOrders = this.availableOrders.filter(
            order => !this.selectedOrders.some(selected => selected.DocEntry == order.DocEntry)
          );
        },
        error: (err) => {
          this.alertService.error('Erro ao buscar pedidos');
          console.error(err);
        }
      });
  }

  loadMoreOrders(): void {
    if (!this.nextLink) {
      this.alertService.error('Não há mais pedidos para carregar');
      return;
    }

    this.orderSalesService
      .searchAll(this.nextLink)
      .subscribe({
        next: (result: NextLink<PedidoVenda>) => {
          this.availableOrders = [
            ...this.availableOrders,
            ...result.content.filter(
              order => !this.selectedOrders.some(selected => selected.DocEntry == order.DocEntry)
            )
          ];
          this.nextLink = result.nextLink;
        },
        error: (err) => {
          this.alertService.error('Erro ao carregar mais pedidos');
          console.error(err);
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
    if (this.showStock && this.availableOrders.length > 0) {
      this.loadQuantidadesEmCarregamento();
    }
  }

sendOrder() {
  if (!this.nameOrdInput || this.selectedOrders.length == 0) {
    this.alertService.error('Preencha o nome da ordem e selecione pelo menos um pedido');
    return;
  }

  this.loading = true;

  const ordemCarregamento = new OrdemCarregamento();
  ordemCarregamento.U_nameOrdem = this.nameOrdInput;
  ordemCarregamento.U_Status = 'Aberto';
  ordemCarregamento.U_filial3 = this.branchId;

  this.ordemCarregamentoService.save(ordemCarregamento).subscribe({
    next: (response: any) => {
      const ordemCriada = response; 
      const docEntryOrdem = ordemCriada.DocEntry;
      const updateRequests = this.selectedOrders.map(pedido => {
        return this.orderSalesService.updateOrdemCarregamento(pedido.DocEntry.toString(), docEntryOrdem);
      });

      forkJoin(updateRequests).subscribe({
        next: () => {
          this.concluirEnvio();
        },
        error: (err) => {
          this.loading = false;
          this.alertService.error('Erro ao atualizar pedidos com a ordem de carregamento');
          console.error(err);
        }
      });
    },
    error: (err) => {
      this.loading = false;
      this.alertService.error('Erro ao criar ordem de carregamento');
      console.error(err);
    }
  });
}

    concluirEnvio() {
      this.alertService.info('Ordem de carregamento criada com sucesso').then(() => {
        this.loading = false;
        this.limparFormulario();
      });
    }

    limparFormulario() {
      this.router.navigateByUrl('/RefreshComponent', { skipLocationChange: true }).then(() => {
        this.router.navigate(['ordem-carregamento/detalhes']);
      });
    }

  loadQuantidadesEmCarregamento() {
    this.availableOrders.forEach(order => {
      if (order.ItemCode) {
        this.ordemCarregamentoService.getEstoqueEmCarregamento(order.ItemCode)
          .subscribe(quantidade => {
            order.quantidadeEmCarregamento = quantidade;
          });
      }
    });
  }
}