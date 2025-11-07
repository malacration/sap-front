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
      this.parameterService.setParam(this.route, 'id', event.data.DocEntry);
    }
    if (event.type == 'editar') {
      this.parameterService.setParam(this.route, 'edit', event.data.DocEntry);
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
        this.assignOrdem(target, null);
        return;
      }
      this.loadOrdemCarregamento(value, target);
    });
    this.routeSubscriptions.push(...subscriptions);
  }

  private loadOrdemCarregamento(id: string, target: 'selected' | 'edit'): void {
    const cached = this.pageContent?.content?.find((ordem) => ordem.DocEntry?.toString() === id);
    if (cached) {
      this.handleOrdemSelection(cached, target);
      return;
    }

    this.service.get(id).subscribe({
      next: (ordem: OrdemCarregamento) => {
        this.handleOrdemSelection(ordem, target);
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

  private handleOrdemSelection(ordem: OrdemCarregamento, target: 'selected' | 'edit'): void {
    this.assignOrdem(target, ordem);

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
}
