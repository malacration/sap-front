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
    if(this.hasParam("id")){
      this.registerRouteParam('id');
    }else if(this.hasParam('edit')){
      this.registerRouteParam('edit');
    }else{
      this.pageChange(0);
    }
  }

  novo(){
    this.removeParams()
    this.selected = new OrdemCarregamento();
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
    // if(this.showView()){
    //   alert("ola")
    //   this.unsubscribe()
    //   this.removeParams()
    //   if(!this.pageContent || this.pageContent?.content?.length == 0)
    //     this.pageChange(0)
    //   this.selected = null
    // }

    this.removeParams()

    
    // const ordem = this.editingOrdem;
    // this.editingOrdem = null;
    // this.selectionState.edit = 0;
    // this.parameterService.removeParam(this.route, 'edit');

    // if (ordem?.DocEntry) {
    //   this.selected = ordem;
    //   this.parameterService.setParam(this.route, 'id', String(ordem.DocEntry));
    //   return;
    // }

    // this.selected = null;
    // this.selectionState.selected = 0;
    // this.parameterService.removeParam(this.route, 'id');
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
      this.loadOrdemCarregamento(value);
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
      },
      error: () => {
        this.alertService.error('Erro ao carregar a ordem de carregamento.');
      }
    });
  }

  private handleOrdemSelection(ordem: OrdemCarregamento): void {
    this.selected = ordem
    this.pedidosVendaService.search(ordem.DocEntry).subscribe({
      next : (pedidos) => {
        ordem.pedidosVenda = this.normalizePedidosResponse(pedidos);
        ordem.pedidosVendaCarregados = true;
      },
      error: () => {
        this.alertService.error('Erro ao carregar os pedidos da ordem.');
      }
    });
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

  private removeParams(): void {
    this.parameterService.removeParam(this.route, "id")
    this.parameterService.removeParam(this.route, "edit")
    this.parameterService.removeParam(this.route, "new")
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
}
