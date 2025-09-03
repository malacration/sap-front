import { Component, OnInit } from '@angular/core';
import { SalesPersonService } from '../../service/sales-person.service';
import { forkJoin, Observable } from 'rxjs';
import { AlertService } from '../../service/alert.service';
import { Router, ActivatedRoute } from '@angular/router';
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
  branchId: string = "11"; // Valor padrão, pode ser mantido ou removido
  selectedBranch: Branch = null;
  localidade: Localidade = null;
  showStock: boolean = false;
  isNameManuallyEdited: boolean = false;
  availableOrders: PedidoVenda[] = [];
  selectedOrders: PedidoVenda[] = [];
  nextLink: string = '';
  private previousBranchId: string = null;
  private previousLocalidadeCode: string = null;
  loading = false;
  isLoadingOrders = false;

  // Variáveis para edição
  ordemId: number | null = null;
  initialSelectedOrders: PedidoVenda[] = [];

  constructor(
    private localidadeService: LocalidadeService,
    private alertService: AlertService,
    private router: Router,
    private orderSalesService: OrderSalesService,
    private ordemCarregamentoService: OrdemCarregamentoService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.ordemId = params['id'] ? +params['id'] : null;
      if (this.ordemId) {
        this.carregarOrdemParaEdicao();
      }
    });
  }

  // AJUSTE: Carregar dados da ordem sem chamar criarAnalise automaticamente
  carregarOrdemParaEdicao() {
    this.loading = true;
    this.ordemCarregamentoService.get(this.ordemId.toString()).subscribe({
      next: (ordem: OrdemCarregamento) => {
        this.nameOrdInput = ordem.U_nameOrdem;
        this.branchId = ordem.U_filial3?.toString() || ''; // Define apenas se existir
        // Não preenchemos selectedBranch ou localidade automaticamente
        // Carregar pedidos selecionados
        this.carregarPedidosExistentes();
      },
      error: (err) => {
        this.alertService.error('Erro ao carregar ordem para edição: ' + err.message);
        this.loading = false;
      }
    });
  }

  // AJUSTE: Carregar pedidos existentes sem chamar criarAnalise
  carregarPedidosExistentes() {
    this.orderSalesService.getPedidosBy(this.ordemId).subscribe({
      next: (pedidos: PedidoVenda[]) => {
        this.selectedOrders = pedidos;
        this.initialSelectedOrders = [...pedidos];
        this.loading = false;
        // Não chamamos criarAnalise() aqui para evitar o erro
      },
      error: (err) => {
        this.alertService.error('Erro ao carregar pedidos: ' + err.message);
        this.loading = false;
      }
    });
  }

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

    this.isLoadingOrders = true;

    const branchChanged = this.previousBranchId !== this.branchId;
    this.previousBranchId = this.branchId;
    this.previousLocalidadeCode = this.localidade?.Code;

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
          this.isLoadingOrders = false;
        },
        error: (err) => {
          this.alertService.error('Erro ao buscar pedidos');
          console.error(err);
          this.isLoadingOrders = false;
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

    if (this.ordemId) {
      this.updateOrder();
    } else {
      this.createOrder();
    }
  }

  createOrder() {
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

  updateOrder() {
    const toRemove = this.initialSelectedOrders.filter(initial =>
      !this.selectedOrders.some(current => current.DocEntry === initial.DocEntry)
    ).map(p => p.DocNum);

    const toAdd = this.selectedOrders.filter(current =>
      !this.initialSelectedOrders.some(initial => initial.DocEntry === current.DocEntry)
    ).map(p => p.DocNum);

    const ordemUpdate = new OrdemCarregamento();
    ordemUpdate.U_nameOrdem = this.nameOrdInput;
    ordemUpdate.U_Status = 'Aberto';
    ordemUpdate.U_filial3 = this.branchId;

    this.ordemCarregamentoService.update(ordemUpdate, this.ordemId.toString()).subscribe({
      next: () => {
        if (toRemove.length > 0) {
          this.ordemCarregamentoService.cancelarPedidos(this.ordemId, toRemove).subscribe({
            next: () => {},
            error: (err) => { this.alertService.error('Erro ao remover pedidos: ' + err.message); }
          });
        }

        const addRequests = toAdd.map(docNum =>
          this.orderSalesService.updateOrdemCarregamento(docNum.toString(), this.ordemId)
        );

        forkJoin(addRequests).subscribe({
          next: () => {
            this.concluirEnvio();
          },
          error: (err) => {
            this.loading = false;
            this.alertService.error('Erro ao adicionar pedidos');
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.alertService.error('Erro ao atualizar ordem de carregamento');
        console.error(err);
      }
    });
  }

  concluirEnvio() {
    this.alertService.info('Ordem de carregamento ' + (this.ordemId ? 'atualizada' : 'criada') + ' com sucesso').then(() => {
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