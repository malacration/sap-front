import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AlertService } from '../../service/alert.service';
import { OrderSalesService } from '../../service/document/order-sales.service';
import { Branch } from '../../model/branch';
import { Localidade } from '../../model/localidade/localidade';
import { NextLink } from '../../model/next-link';
import { OrdemCarregamento } from '../../model/logistica/ordem-carregamento';
import { PedidoVenda } from '../document/documento.statement.component';
import { LocalidadeService } from '../../service/localidade.service';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';
import { OrdemCarregamentoDto } from '../../model/logistica/ordem-carregamento-dto';

@Component({
  selector: 'app-ordem-carregamento',
  templateUrl: './ordem-carregamento.component.html',
  styleUrls: ['./ordem-carregamento.component.scss']
})
export class OrdemCarregamentoComponent implements OnInit {
  nameOrdInput: string = '';
  dtInicial: string | null = null;
  dtFinal: string | null = null;
  branchId: string = '11';
  selectedBranch: Branch | null = null;
  localidade: Localidade | null = null;
  showStock: boolean = false;
  isNameManuallyEdited: boolean = false;
  availableOrders: PedidoVenda[] = [];
  selectedOrders: PedidoVenda[] = [];
  nextLink: string = '';
  loading = false;
  isLoadingOrders = false;
  ordemId: number | null = null;
  initialSelectedOrders: PedidoVenda[] = [];

  constructor(
    private localidadeService: LocalidadeService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute,
    private orderSalesService: OrderSalesService,
    private ordemCarregamentoService: OrdemCarregamentoService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.ordemId = params['id'] ? +params['id'] : null;
      if (this.ordemId) {
        this.carregarOrdemParaEdicao();
      }
    });
  }

  carregarOrdemParaEdicao(): void {
    this.loading = true;
    this.ordemCarregamentoService.get(this.ordemId!.toString()).subscribe({
      next: (ordem: OrdemCarregamento) => {
        this.nameOrdInput = ordem.U_nameOrdem;
        this.branchId = ordem.U_filial3?.toString() || '11';
        this.carregarPedidosExistentes();
      },
      error: () => {
        this.alertService.error('Erro ao carregar ordem para edição.');
        this.loading = false;
      }
    });
  }

  carregarPedidosExistentes(): void {
    this.orderSalesService.getPedidosBy(this.ordemId!).subscribe({
      next: (pedidos: PedidoVenda[]) => {
        this.selectedOrders = pedidos;
        this.initialSelectedOrders = [...pedidos];
        this.loading = false;
      },
      error: () => {
        this.alertService.error('Erro ao carregar pedidos.');
        this.loading = false;
      }
    });
  }

  selectBranch(branch: Branch): void {
    this.selectedBranch = branch;
    this.branchId = branch.bplid;
    this.updateOrderName();
  }

  selectLocalidade(localidade: Localidade): void {
    this.localidade = localidade;
    this.localidadeService.get(localidade.Code).subscribe({
      next: (loc: Localidade) => {
        this.localidade = loc;
        this.updateOrderName();
      },
      error: () => {
        this.alertService.error('Erro ao carregar localidade.');
      }
    });
  }

  updateOrderName(): void {
    if (!this.isNameManuallyEdited && this.selectedBranch && this.localidade) {
      this.nameOrdInput = `${this.selectedBranch.bplname || 'Filial'} Com Destino: ${this.localidade.Name || 'Localidade'}`;
    }
  }

  onNameInputChange(): void {
    this.isNameManuallyEdited = true;
  }

  canFilter(): boolean {
    return !!this.branchId && !!this.localidade;
  }

  criarAnalise(): void {
    if (!this.canFilter()) {
      this.alertService.error('Preencha todos os campos obrigatórios.');
      return;
    }

    this.isLoadingOrders = true;
    this.orderSalesService
      .search(this.dtInicial || '', this.dtFinal || '', this.branchId, this.localidade!.Code)
      .subscribe({
        next: (result: NextLink<PedidoVenda>) => {
          this.availableOrders = result.content.filter(
            order => !this.selectedOrders.some(selected => selected.DocEntry == order.DocEntry)
          );
          this.nextLink = result.nextLink;
          this.isLoadingOrders = false;
        },
        error: () => {
          this.alertService.error('Erro ao buscar pedidos.');
          this.isLoadingOrders = false;
        }
      });
  }

  loadMoreOrders(): void {
    if (!this.nextLink) {
      this.alertService.error('Não há mais pedidos para carregar.');
      return;
    }

    this.orderSalesService.searchAll(this.nextLink).subscribe({
      next: (result: NextLink<PedidoVenda>) => {
        this.availableOrders = [
          ...this.availableOrders,
          ...result.content.filter(
            order => !this.selectedOrders.some(selected => selected.DocEntry == order.DocEntry)
          )
        ];
        this.nextLink = result.nextLink;
      },
      error: () => {
        this.alertService.error('Erro ao carregar mais pedidos.');
      }
    });
  }

  onSelectedOrdersChange(orders: PedidoVenda[]): void {
    this.selectedOrders = orders;
  }

  clearDataInicial(): void {
    this.dtInicial = null;
  }

  clearDataFinal(): void {
    this.dtFinal = null;
  }

  toggleEstoque(): void {
    this.showStock = !this.showStock;
    if (this.showStock && this.availableOrders.length > 0) {
      this.loadQuantidadesEmCarregamento();
    }
  }

  loadQuantidadesEmCarregamento(): void {
    this.availableOrders.forEach(order => {
      if (order.ItemCode) {
        this.ordemCarregamentoService.getEstoqueEmCarregamento(order.ItemCode).subscribe({
          next: (quantidade) => {
            order.quantidadeEmCarregamento = quantidade;
          },
          error: () => {
            this.alertService.error(`Erro ao carregar estoque para ${order.ItemCode}.`);
          }
        });
      }
    });
  }

  validateForm(): boolean {
    if (!this.nameOrdInput || this.selectedOrders.length == 0) {
      this.alertService.error('Preencha o nome da ordem e selecione pelo menos um pedido.');
      return false;
    }
    return true;
  }

  sendOrder(): void {
    if (!this.validateForm()) {
      return;
    }
    this.ordemId ? this.updateOrder() : this.createOrder();
  }

  private createOrder(): void {
    this.loading = true;
    const ordemCarregamento = new OrdemCarregamento();
    ordemCarregamento.U_nameOrdem = this.nameOrdInput;
    ordemCarregamento.U_Status = 'Aberto';
    ordemCarregamento.U_filial3 = this.branchId;

    const dto = new OrdemCarregamentoDto(
      ordemCarregamento,
      this.selectedOrders.map(pedido => pedido.DocEntry)
    )
    this.ordemCarregamentoService.save2(dto).subscribe(it =>
      alert("savei")
    )

    this.loading = false;
    // this.ordemCarregamentoService.save(ordemCarregamento).subscribe({
    //   next: (response: any) => {
    //     const docEntryOrdem = response.DocEntry;
    //     const updateRequests = this.selectedOrders.map(pedido =>
    //       this.orderSalesService.updateOrdemCarregamento(pedido.DocEntry.toString(), docEntryOrdem)
    //     );

    //     forkJoin(updateRequests).subscribe({
    //       next: () => this.concluirEnvio(),
    //       error: () => {
    //         this.alertService.error('Erro ao atualizar pedidos com a ordem de carregamento.');
    //         this.loading = false;
    //       }
    //     });
    //   },
    //   error: () => {
    //     this.alertService.error('Erro ao criar ordem de carregamento.');
    //     this.loading = false;
    //   }
    // });
  }

  private updateOrder(): void {
    const toRemove = this.initialSelectedOrders
      .filter(initial => !this.selectedOrders.some(current => current.DocEntry == initial.DocEntry))
      .map(p => p.DocNum);
    const toAdd = this.selectedOrders
      .filter(current => !this.initialSelectedOrders.some(initial => initial.DocEntry == current.DocEntry))
      .map(p => p.DocNum);

    const ordemUpdate = new OrdemCarregamento();
    ordemUpdate.U_nameOrdem = this.nameOrdInput;
    ordemUpdate.U_Status = 'Aberto';
    ordemUpdate.U_filial3 = this.branchId;

    this.ordemCarregamentoService.update(ordemUpdate, this.ordemId!.toString()).subscribe({
      next: () => {
        if (toRemove.length > 0) {
          this.ordemCarregamentoService.cancelarPedidos(this.ordemId!, toRemove).subscribe({
            error: () => this.alertService.error('Erro ao remover pedidos.')
          });
        }

        const addRequests = toAdd.map(docNum =>
          this.orderSalesService.updateOrdemCarregamento(docNum.toString(), this.ordemId!)
        );

        forkJoin(addRequests).subscribe({
          next: () => this.concluirEnvio(),
          error: () => {
            this.alertService.error('Erro ao adicionar pedidos.');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.alertService.error('Erro ao atualizar ordem de carregamento.');
        this.loading = false;
      }
    });
  }

  private concluirEnvio(): void {
    this.alertService.info(`Ordem de carregamento ${this.ordemId ? 'atualizada' : 'criada'} com sucesso.`).then(() => {
      this.loading = false;
      this.router.navigate(['ordem-carregamento/detalhes']);
    });
  }
}