import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/service/auth.service';
import { Page } from '../../model/page.model';
import { Column } from '../../../shared/components/table/column.model';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin, map } from 'rxjs';
import { ParameterService } from '../../../shared/service/parameter.service';
import { AlertService } from '../../service/alert.service';
import { OrdemCarregamento } from '../../model/logistica/ordem-carregamento';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';

@Component({
  selector: 'app-ordem-carregamento-statement',
  templateUrl: './ordem-carregamento-statement.component.html',
  styleUrls: ['./ordem-carregamento-statement.component.scss']
})
export class OrdemCarregamentoStatementComponent implements OnInit, OnDestroy {
  nomeUsuario: string;
  loading = false;
  pageContent: Page<OrdemCarregamento> = new Page<OrdemCarregamento>();
  selected: OrdemCarregamento | null = null;
  all = false;

  private routeSubscriptions: Subscription[] = [];

  definition: Column[] = [
    new Column('ID', 'DocEntry'),
    new Column('Nome', 'U_nameOrdem'),
    new Column('Peso Total (Kg)', 'U_pesoTotal2'),
    new Column('Qtd. Pedidos', 'quantidadePedidos'),
    new Column('Status', 'U_Status'),
    new Column('Criado em', 'dataCriacao')
  ];

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private parameterService: ParameterService,
    private service: OrdemCarregamentoService
  ) {
    this.nomeUsuario = this.auth.getUser();
  }

  ngOnInit(): void {
    this.pageChange(0);
    this.routeSubscriptions = this.parameterService.subscribeToParam(this.route, 'id', (id: string) => {
      if (id) {
        this.service.get(id).subscribe({
          next: (ordem: OrdemCarregamento) => {
            this.selected = ordem;
          },
          error: () => {
            this.alertService.error('Erro ao carregar a ordem de carregamento.');
          }
        });
      }
    });
  }

  pageChange(page: number): void {
    this.loading = true;
    this.service.getAll(page, this.all).subscribe({
      next: (pageData: Page<OrdemCarregamento>) => {
        const detalhesRequests = pageData.content.map(ordem =>
          this.service.getDetalhes(ordem.DocEntry).pipe(
            map(detalhes => ({ ordem, detalhes }))
          )
        );

        forkJoin(detalhesRequests).subscribe({
          next: (results) => {
            results.forEach(({ ordem, detalhes }) => {
              const docEntriesUnicos = new Set(detalhes.map(d => d.DocEntry));
              ordem.quantidadePedidos = docEntriesUnicos.size;
              ordem.U_pesoTotal2 = detalhes.reduce((total, detalhe) => {
                return total + (detalhe.Quantity * detalhe.Weight1);
              }, 0).toString();
            });
            this.pageContent = pageData;
            this.loading = false;
          },
          error: () => {
            this.alertService.error('Erro ao carregar os detalhes das ordens.');
            this.loading = false;
          }
        });
      },
      error: () => {
        this.alertService.error('Erro ao carregar as ordens de carregamento.');
        this.loading = false;
      }
    });
  }

  action(event: ActionReturn): void {
    if (event.type == 'selected') {
      this.parameterService.setParam(this.route, 'id', event.data.DocEntry);
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
}