import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Branch } from '../../../../sap/model/branch';
import { Localidade } from '../../../../sap/model/localidade/localidade';
import { PedidoVenda } from '../../../../sap/components/document/documento.statement.component';
import { OrdemCarregamento } from '../../models/ordem-carregamento';
import { AlertService } from '../../../../shared/service/alert.service';
import { OrderSalesService } from '../../../sap-shared/_services/documents/order-sales.service';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';
import { LocalidadeService } from '../../../sap-shared/_services/localidade.service';
import { NextLink } from '../../../../sap/model/next-link';
import { OrdemCarregamentoDto } from '../../models/ordem-carregamento-dto';
import { CardComponent } from '../../../../shared/components/card/card.component';

@Component({
  selector: 'app-ordem-formulario',
  templateUrl: './formulario.component.html',
  styleUrls: ['./formulario.component.scss']
})
export class FormularioComponent implements OnInit, OnChanges {

  @ViewChild('cardFilter', {static: true}) cardFilterComponent: CardComponent;
  
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

  @Input()
  ordemCarregamento : OrdemCarregamento = new OrdemCarregamento()
  @Output()
  back = new EventEmitter<void>();

  constructor(
    private localidadeService: LocalidadeService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute,
    private orderSalesService: OrderSalesService,
    private ordemCarregamentoService: OrdemCarregamentoService
  ) {}

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ordemCarregamento']) {
      this.hydrateSelectedOrders();
    }
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
    if (!this.ordemCarregamento?.DocEntry) {
      return;
    }
    this.loading = true;
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
      this.ordemCarregamento.U_nameOrdem = `${this.selectedBranch.Bplname || 'Filial'} Com Destino: ${this.localidade.Name || 'Localidade'}`;
    }
  }

  onNameInputChange(): void {
    this.isNameManuallyEdited = true;
  }

  canFilter(): boolean {
    return !!this.selectedBranch?.Bplid && !!this.localidade;
  }

  modalAnaliseLogistica = false

  abreAnaliseLogistica(){
    this.modalAnaliseLogistica = true
  }

  criarAnalise(): void {
    this.cardFilterComponent.collapsed = true
    if (!this.canFilter()) {
      this.alertService.error('Preencha todos os campos obrigatórios.');
      return;
    }

    this.isLoadingOrders = true;
    this.orderSalesService
      .search(this.dtInicial || '', this.dtFinal || '', this.selectedBranch.Bplid, this.localidade!.Code)
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
    this.ordemCarregamentoService.save(dto).subscribe(it => {
      this.concluirEnvio()
      this.ordemCarregamento = it
      this.loading = false;
    })
  }

  private concluirEnvio(): void {
    this.alertService.info(`Ordem de carregamento ${this.ordemCarregamento.DocEntry ? 'atualizada' : 'criada'} com sucesso.`).then(() => {
      this.loading = false;
      this.router.navigate(['ordem-carregamento/'+this.ordemCarregamento.DocEntry]);
    });
  }

  private hydrateSelectedOrders(): void {
    if (!this.ordemCarregamento) {
      this.selectedOrders = [];
      this.initialSelectedOrders = [];
      return;
    }

    const pedidos = this.ordemCarregamento.pedidosVenda || [];
    if (pedidos.length > 0) {
      this.selectedOrders = [...pedidos];
      this.initialSelectedOrders = [...pedidos];
      return;
    }

    if (this.ordemCarregamento.DocEntry) {
      this.carregarPedidosExistentes();
      return;
    }

    this.selectedOrders = [];
    this.initialSelectedOrders = [];
  }

  goBack(): void {
    this.back.emit();
  }
}
