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
  
  dtInicial: string | null = null;
  dtFinal: string | null = null;
  
  selectedBranch: Branch | null = null;
  localidade: Localidade | null = null;
  showStock: boolean = false;
  isNameManuallyEdited: boolean = false;
  availableOrders: PedidoVenda[] = [];
  selectedOrders: PedidoVenda[] = [];
  nextLink: string = '';
  loading = false;
  isLoadingOrders = false;
  
  // nameOrdInput: string = '';
  // ordemId: number | null = null;
  // branchId: string = '11';
  
  initialSelectedOrders: PedidoVenda[] = [];

  ordemCarregamento : OrdemCarregamento = new OrdemCarregamento()

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
      if (params['id']) {
        this.carregarOrdemParaEdicao(params['id']);
      }
    });
  }

  carregarOrdemParaEdicao(docEntry : string): void {
    this.loading = true;
    this.ordemCarregamentoService.get(docEntry).subscribe({
      next: (ordem: OrdemCarregamento) => {
        this.ordemCarregamento = ordem
        this.carregarPedidosExistentes();
      },
      error: () => {
        this.alertService.error('Erro ao carregar ordem para edição.');
        this.loading = false;
      }
    });
  }


  //TODO o back deveria voltar tudo no getOrdemCarregamento!
  carregarPedidosExistentes(): void {
    this.orderSalesService.getPedidosBy(this.ordemCarregamento.DocEntry).subscribe({
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
    //TODO duvidoso esse cara
    // this.ordemCarregamento.U_filial3 = branch.bplid
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
      this.ordemCarregamento.U_nameOrdem = `${this.selectedBranch.bplname || 'Filial'} Com Destino: ${this.localidade.Name || 'Localidade'}`;
    }
  }

  onNameInputChange(): void {
    this.isNameManuallyEdited = true;
  }

  canFilter(): boolean {
    return !!this.selectedBranch?.bplid && !!this.localidade;
  }

  criarAnalise(): void {
    if (!this.canFilter()) {
      this.alertService.error('Preencha todos os campos obrigatórios.');
      return;
    }

    this.isLoadingOrders = true;
    this.orderSalesService
      .search(this.dtInicial || '', this.dtFinal || '', this.selectedBranch.bplid, this.localidade!.Code)
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
    if (!this.ordemCarregamento.U_nameOrdem || this.selectedOrders.length == 0) {
      this.alertService.error('Preencha o nome da ordem e selecione pelo menos um pedido.');
      return false;
    }
    return true;
  }

  sendOrder(): void {
    if (!this.validateForm()) {
      return;
    }
    this.createOrUpdate()
  }

  private createOrUpdate(): void {
    this.loading = true;
    
    const toRemove = this.initialSelectedOrders
      .filter(initial => !this.selectedOrders.some(current => current.DocEntry == initial.DocEntry))
      .map(p => p.DocEntry);

    const dto = new OrdemCarregamentoDto(
      this.ordemCarregamento,
      this.selectedOrders.map(pedido => pedido.DocEntry),
      toRemove
    )
    this.ordemCarregamentoService.save2(dto).subscribe(it => {
      this.concluirEnvio()
      // this.ordemCarregamento = it
      //vincula a ordem ao objeto do estado - aqui vai ter que manter os pedidos selecionados
      // this.ordemcarregamento.pedidos
      this.loading = false;
    })
  }

  private concluirEnvio(): void {
    this.alertService.info(`Ordem de carregamento ${this.ordemCarregamento.DocEntry ? 'atualizada' : 'criada'} com sucesso.`).then(() => {
      this.loading = false;
      this.router.navigate(['ordem-carregamento/detalhes']);
    });
  }
}