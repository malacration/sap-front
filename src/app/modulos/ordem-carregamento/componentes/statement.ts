import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Page } from '../../../sap/model/page.model';
import { AuthService } from '../../../shared/service/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from '../../../shared/service/alert.service';
import { ParameterService } from '../../../shared/service/parameter.service';
import { OrdemCarregamentoFilter, OrdemCarregamentoService } from '../service/ordem-carregamento.service';
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
  filtroId = '';
  filtroStatus = 'Aberto';
  filtroCreateDateFrom = this.getTodayDate();
  filtroCreateDateTo = this.getTodayDate();
  readonly statusOptions: string[] = ['Aberto', 'Fechado', 'Cancelado'];

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private parameterService: ParameterService,
    private service: OrdemCarregamentoService,
    private pedidosVendaService: PedidosVendaService,
  ) {
    this.nomeUsuario = this.auth.getUser();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.loadOrdemCarregamento(params['id']);
      } else if (params['edit']) {
        if (params['edit'] == '-1') {
          this.selected = new OrdemCarregamento();
        } else {
          this.loadOrdemCarregamento(params['edit']);
        }} else {
          this.pageChange(0)
        }
    });
  }

  novo(){
    this.removeParams()
    this.selected = new OrdemCarregamento();
    this.parameterService.setParam(this.route,"edit",'-1')
  }

  pageChange(page: number): void {
    this.loading = true;
    this.service.getAll(page, this.all, this.getFilters()).subscribe({
      next: (pageData: Page<OrdemCarregamento>) => {
        this.pageContent = pageData;
        this.loading = false;
      },
      complete: () => {
          this.loading = false;
      }
    })
  }

  filtrar(): void {
    if (!this.isDateRangeValid()) {
      this.alertService.error('A data final do filtro deve ser maior ou igual à data inicial.');
      return;
    }

    this.pageChange(0);
  }

  limparFiltros(): void {
    this.filtroId = '';
    this.filtroStatus = 'Aberto';
    this.filtroCreateDateFrom = this.getTodayDate();
    this.filtroCreateDateTo = this.getTodayDate();
    this.pageChange(0);
  }

  action(event: ActionReturn): void {
    if (event.type == 'selected') {
      this.selected = event.data
      this.parameterService.setParam(this.route,"id",event.data.DocEntry)
    }
    if (event.type == 'editar') {
      this.selected = event.data
      this.parameterService.setParam(this.route,"edit",event.data.DocEntry)
    }
    if(this.selected){
      this.handleOrdemSelection(this.selected)
    }
  }

  showList(): boolean {
    return !this.hasParam('id') && !this.hasParam('edit');
  }

  showView(): boolean {
    return this.hasParam('id') && !this.hasParam('edit') && !!this.selected;
  }

  showEdit(): boolean {
    return this.hasParam('edit') && !!this.selected && !this.showView();
  }

  handleFormBack(): void {
    this.unsubscribe();
    this.removeParams(); 
    this.selected = null;
      this.pageChange(0);
  }

  close(): void {
    this.selected = null;
    this.selectionState.selected = 0;
    this.parameterService.removeParam(this.route, 'id');
  }

  onToggleAll(): void {
    this.all = !this.all;
    this.pageChange(0);
  }

  ngOnDestroy(): void {
    this.unsubscribe()
  }

  unsubscribe(){
    this.routeSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private registerRouteParam(param: string): void {
    this.unsubscribe()
    this.routeSubscriptions = this.parameterService.subscribeToParam(this.route, param, (value: string | null) => {
      if(value != '-1'){
        this.loadOrdemCarregamento(value);
      }        
    });
  }

  private loadOrdemCarregamento(id: string): void {
    const cached = this.findCachedOrdem(id);
    if (cached) {
      this.handleOrdemSelection(cached);
      return;
    }

    this.service.get(id).subscribe({
      next: (ordem: OrdemCarregamento) => {
        this.handleOrdemSelection(ordem);
      }
    });
  }

  public handleOrdemSelection(ordem: OrdemCarregamento): void {
    this.selected = ordem
    ordem.pedidosVendaCarregados = false;
    this.pedidosVendaService.search(ordem.DocEntry).subscribe({
      next : (pedidos) => {
        ordem.pedidosVenda = this.normalizePedidosResponse(pedidos);
        ordem.pedidosVendaCarregados = true;
      },
    });
  }

  private normalizePedidosResponse(response: any): any[] {
    if (!response) {
      return [];
    }
    if (Array.isArray(response?.content)) {
      return response.content;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [response];
  }

  private removeParams(): void {
    this.router.navigate([],{
        relativeTo: this.route,
        queryParams: null 
      }
    );
  }

  private findCachedOrdem(id: string): OrdemCarregamento | undefined {
    if (this.selected?.DocEntry?.toString() === id) {
      return this.selected;
    }
    return this.pageContent?.content?.find((ordem) => ordem.DocEntry?.toString() === id);
  }

  private hasParam(param: 'id' | 'edit'): boolean {
    return this.parameterService.hasParam(this.route, param);
  }

  private getFilters(): OrdemCarregamentoFilter {
    const id = this.filtroId.trim();

    return {
      id: id.length ? id : null,
      status: this.filtroStatus || null,
      createDateFrom: this.filtroCreateDateFrom || null,
      createDateTo: this.filtroCreateDateTo || null,
    };
  }

  private isDateRangeValid(): boolean {
    if (!this.filtroCreateDateFrom || !this.filtroCreateDateTo) {
      return true;
    }

    return this.filtroCreateDateFrom <= this.filtroCreateDateTo;
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
