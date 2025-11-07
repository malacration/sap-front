import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription, map } from 'rxjs';
import { Page } from '../../../sap/model/page.model';
import { AuthService } from '../../../shared/service/auth.service';
import { ActivatedRoute } from '@angular/router';
import { AlertService } from '../../../shared/service/alert.service';
import { ParameterService } from '../../../shared/service/parameter.service';
import { OrdemCarregamentoService } from '../service/ordem-carregamento.service';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { OrdemCarregamento } from '../models/ordem-carregamento';
import { PedidosVendaService } from '../../../sap/service/document/pedidos-venda.service';

@Component({
  selector: 'ordem-carregamento-statement',
  templateUrl: './statement.html',
  styleUrls: ['./statement.scss']
})
export class OrdemCarregamentoStatementComponent implements OnInit, OnDestroy {
  nomeUsuario: string;
  loading = false;
  pageContent: Page<OrdemCarregamento> = new Page<OrdemCarregamento>();
  selected: OrdemCarregamento | null = null;
  selectedEdit: OrdemCarregamento | null = null;
  private selectionSequence = 0;
  private selectionState: { selected: number; edit: number } = { selected: 0, edit: 0 };
  private readonly targetParamMap: Record<'selected' | 'edit', 'id' | 'edit'> = {
    selected: 'id',
    edit: 'edit',
  };
  all = false;
  readonly pageChangeHandler = (page: number) => this.pageChange(page);

  private routeSubscriptions: Subscription[] = [];
  page: (page: number) => void;

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private parameterService: ParameterService,
    private service: OrdemCarregamentoService,
    private pedidosVendaService: PedidosVendaService,
  ) {
    this.nomeUsuario = this.auth.getUser();
  }

  ngOnInit(): void {
    this.pageChange(0);
    this.registerRouteParam('id', 'selected');
    this.registerRouteParam('edit', 'edit');
  }

  novo(){
    this.selectedEdit = new OrdemCarregamento()
  }

  pageChange(page: number): void {
    this.loading = true;
    this.service.getAll(page, this.all).subscribe({
      next: (pageData: Page<OrdemCarregamento>) => {
        this.pageContent = pageData;
        this.loading = false;
      },
      error: () => {
            this.alertService.error('Erro ao carregar os detalhes das ordens.');
            this.loading = false;
          }
    })
    // this.service.getAll(page, this.all).subscribe({
    //   next: (pageData: Page<OrdemCarregamento>) => {
    //     const detalhesRequests = pageData.content.map(ordem =>
    //       this.service.getDetalhes(ordem.DocEntry).pipe(
    //         map(detalhes => ({ ordem, detalhes }))
    //       )
    //     );

    //     forkJoin(detalhesRequests).subscribe({
    //       next: (results) => {
    //         results.forEach(({ ordem, detalhes }) => {
    //           const docEntriesUnicos = new Set(detalhes.map(d => d.DocEntry));
    //           ordem.quantidadePedidos = docEntriesUnicos.size;
    //           ordem.U_pesoTotal2 = detalhes.reduce((total, detalhe) => {
    //             return total + (detalhe.Quantity * detalhe.Weight1);
    //           }, 0).toString();
    //         });
    //         this.pageContent = pageData;
    //         this.loading = false;
    //       },
    //       error: () => {
    //         this.alertService.error('Erro ao carregar os detalhes das ordens.');
    //         this.loading = false;
    //       }
    //     });
    //   },
    //   error: () => {
    //     this.alertService.error('Erro ao carregar as ordens de carregamento.');
    //     this.loading = false;
    //   }
    // });
  }

  action(event: ActionReturn): void {
    if (event.type == 'selected') {
      this.updateSelectionParam('selected', event.data.DocEntry);
    }
    if (event.type == 'editar') {
      this.updateSelectionParam('edit', event.data.DocEntry);
    }
  }

  close(): void {
    this.selected = null;
    this.parameterService.removeParam(this.route, 'id');
  }

  onToggleAll(): void {
    this.all = !this.all;
    this.pageChange(0);
  }

  ngOnDestroy(): void {
    this.routeSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private registerRouteParam(param: string, target: 'selected' | 'edit'): void {
    const subscriptions = this.parameterService.subscribeToParam(this.route, param, (value: string | null) => {
      if (!value) {
        this.selectionState[target] = 0;
        this.assignOrdem(target, null);
        return;
      }
      const token = ++this.selectionSequence;
      this.selectionState[target] = token;
      this.loadOrdemCarregamento(value, target, token);
    });
    this.routeSubscriptions.push(...subscriptions);
  }

  private loadOrdemCarregamento(id: string, target: 'selected' | 'edit', token: number): void {
    const cached = this.pageContent?.content?.find((ordem) => ordem.DocEntry?.toString() === id);
    if (cached) {
      this.handleOrdemSelection(cached, target, token);
      return;
    }

    this.service.get(id).subscribe({
      next: (ordem: OrdemCarregamento) => {
        this.handleOrdemSelection(ordem, target, token);
      },
      error: () => {
        this.alertService.error('Erro ao carregar a ordem de carregamento.');
      }
    });
  }

  private assignOrdem(target: 'selected' | 'edit', ordem: OrdemCarregamento | null): void {
    if (target === 'selected') {
      this.selected = ordem;
      if (ordem) {
        this.selectedEdit = null;
      }
    } else {
      this.selectedEdit = ordem;
      if (ordem) {
        this.selected = null;
      }
    }
  }

  private handleOrdemSelection(ordem: OrdemCarregamento, target: 'selected' | 'edit', token: number): void {
    if (!this.isSelectionStillActive(target, token)) {
      return;
    }

    this.assignOrdem(target, ordem);
    this.ensureExclusiveParam(target);

    if (ordem.pedidosVendaCarregados) {
      return;
    }

    this.fetchPedidos(ordem).subscribe({
      error: () => {
        this.alertService.error('Erro ao carregar os pedidos da ordem.');
      }
    });
  }

  private fetchPedidos(ordem: OrdemCarregamento): Observable<void> {
    return this.pedidosVendaService.search(ordem.DocEntry).pipe(
      map((pedidos) => {
        ordem.pedidosVenda = this.normalizePedidosResponse(pedidos);
        ordem.pedidosVendaCarregados = true;
      })
    );
  }

  private normalizePedidosResponse(response: any): any[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.content)) {
      return response.content;
    }

    return [response];
  }

  private updateSelectionParam(target: 'selected' | 'edit', value: string | number): void {
    const paramName = this.targetParamMap[target];
    const otherTarget = this.getOppositeTarget(target);
    const otherParam = this.targetParamMap[otherTarget];

    this.selectionState[otherTarget] = 0;
    this.parameterService.removeParam(this.route, otherParam);
    this.parameterService.setParam(this.route, paramName, String(value));
  }

  private ensureExclusiveParam(target: 'selected' | 'edit'): void {
    const otherTarget = this.getOppositeTarget(target);
    if (this.selectionState[otherTarget] === 0) {
      return;
    }

    const otherParam = this.targetParamMap[otherTarget];
    this.parameterService.removeParam(this.route, otherParam);
  }

  private isSelectionStillActive(target: 'selected' | 'edit', token: number): boolean {
    if (this.selectionState[target] !== token) {
      return false;
    }

    const otherTarget = target === 'selected' ? 'edit' : 'selected';
    const otherToken = this.selectionState[otherTarget];

    return otherToken === 0 || token >= otherToken;
  }

  private getOppositeTarget(target: 'selected' | 'edit'): 'selected' | 'edit' {
    return target === 'selected' ? 'edit' : 'selected';
  }
}
