import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import * as moment from 'moment';
import { Branch } from '../../../../sap/model/branch';
import { Localidade } from '../../../../sap/model/localidade/localidade';
import { PedidoVenda } from '../../../../sap/model/document/pedido-venda.model';
import { OrdemCarregamento } from '../../models/ordem-carregamento';
import { AlertService } from '../../../../shared/service/alert.service';
import { OrderSalesService } from '../../../sap-shared/_services/documents/order-sales.service';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';
import { LocalidadeService } from '../../../sap-shared/_services/localidade.service';
import { OrdemCarregamentoDto } from '../../models/ordem-carregamento-dto';
import { chaveSelecao, isFaturaReserva } from '../../models/fatura-reserva';
import { SalesPerson } from '../../../../sap/model/sales-person/sales-person';

@Component({
  selector: 'app-ordem-formulario',
  templateUrl: './formulario.component.html',
  styleUrls: ['./formulario.component.scss']
})
export class FormularioComponent implements OnInit, OnChanges {

  
  dtInicial: string | null = null;
  dtFinal: string | null = null;
  
  selectedBranch: Branch | null = null;
  localidade: Localidade | null = null;
  showStock: boolean = false;
  // '' = todos, 'pedido' ou 'nf-venda-futura' (parametro tipo de /carregamento/search)
  tipoDocumento: string = '';
  cidade: string = '';
  paginaPedidos = 0;
  temMaisPedidos = false;
  carregandoMais = false;
  // Filtros da busca em tela (Carregar Mais usa estes, nao os campos atuais) e numero da busca.
  private filtrosBusca: { dataInicial: string; dataFinal: string; filial: string; localidade?: string; vendedor: any; cidade: string; tipo: string };
  private buscaAtual = 0;
  paginaFaturas = 0;
  temMaisFaturas = false;
  isNameManuallyEdited: boolean = false;
  availableOrders: PedidoVenda[] = [];
  selectedOrders: PedidoVenda[] = [];
  loading = false;
  isLoadingOrders = false;
  vendedor: any;
  
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
    this.applyDefaultDates();
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

  limparLocalidade(busca: { clear(): void }): void {
    busca.clear();
    this.localidade = null;
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
    if (this.isNameManuallyEdited) {
        return;
    }

    const nomeFilial = this.selectedBranch?.Bplname || 'Filial';

    const localidadesUnicas = [...new Set(
      this.selectedOrders
        .map(pedido => pedido.Name) 
        .filter(name => name && name.trim() !== '') 
    )];

    const destinosConcatenados = localidadesUnicas.join(' - ');
    const sulfixo = destinosConcatenados ? destinosConcatenados : '';
    this.ordemCarregamento.U_nameOrdem = `${nomeFilial} Com Destino: ${sulfixo}`;
  }
  onNameInputChange(): void {
    this.isNameManuallyEdited = true;
  }

  canFilter(): boolean {
    return !!this.selectedBranch?.Bplid;
  }

  modalAnaliseLogistica = false

  abreAnaliseLogistica(){
    this.modalAnaliseLogistica = true
  }

  // Pedidos e NF de venda futura vem paginados por documento; "Carregar Mais" pede a proxima pagina dos
  // dois com os filtros da busca que gerou a lista (trocar filtro so vale ao clicar em Filtrar).
  criarAnalise(): void {
    if (!this.canFilter()) {
      this.alertService.error('Preencha todos os campos obrigatórios.');
      return;
    }

    this.filtrosBusca = {
      dataInicial: this.dtInicial || '', dataFinal: this.dtFinal || '', filial: this.selectedBranch.Bplid,
      localidade: this.localidade?.Code, vendedor: this.vendedor, cidade: this.cidade, tipo: this.tipoDocumento,
    };
    const busca = ++this.buscaAtual;
    this.isLoadingOrders = true;
    this.carregandoMais = false;
    this.paginaPedidos = 0;
    this.paginaFaturas = 0;
    forkJoin([this.buscarPedidos(0), this.buscarFaturas(0)]).subscribe({
      next: ([pedidos, faturas]) => {
        if (busca !== this.buscaAtual) return;
        this.availableOrders = this.naoSelecionados([...pedidos.content, ...faturas.content]);
        this.temMaisPedidos = pedidos.temMais;
        this.temMaisFaturas = faturas.temMais;
        this.isLoadingOrders = false;
      },
      error: (err) => {
        if (busca !== this.buscaAtual) return;
        this.alertService.error(err?.error?.message || 'Erro ao buscar pedidos e NFs de venda futura.');
        this.isLoadingOrders = false;
      }
    });
  }

  loadMoreOrders(): void {
    if (this.carregandoMais) return;
    if (!this.temMaisPedidos && !this.temMaisFaturas) {
      this.alertService.error('Não há mais documentos para carregar.');
      return;
    }

    const busca = this.buscaAtual;
    const vazio = of({ content: [] as PedidoVenda[], temMais: false });
    this.carregandoMais = true;
    forkJoin([
      this.temMaisPedidos ? this.buscarPedidos(this.paginaPedidos + 1) : vazio,
      this.temMaisFaturas ? this.buscarFaturas(this.paginaFaturas + 1) : vazio,
    ]).subscribe({
      next: ([pedidos, faturas]) => {
        if (busca !== this.buscaAtual) return;
        // A lista inteira e refiltrada: o dual-list-box move itens so na copia dele.
        this.availableOrders = this.naoSelecionados([...this.availableOrders, ...pedidos.content, ...faturas.content]);
        if (this.temMaisPedidos) {
          this.paginaPedidos++;
          this.temMaisPedidos = pedidos.temMais;
        }
        if (this.temMaisFaturas) {
          this.paginaFaturas++;
          this.temMaisFaturas = faturas.temMais;
        }
        this.carregandoMais = false;
      },
      error: () => {
        if (busca !== this.buscaAtual) return;
        this.alertService.error('Erro ao carregar mais documentos.');
        this.carregandoMais = false;
      }
    });
  }

  private buscarPedidos(pagina: number): Observable<{ content: PedidoVenda[]; temMais: boolean }> {
    const f = this.filtrosBusca;
    if (f.tipo === 'nf-venda-futura') {
      return of({ content: [], temMais: false });
    }
    return this.ordemCarregamentoService.searchPedidos(f.dataInicial, f.dataFinal, f.filial, f.localidade, f.vendedor, f.cidade, pagina);
  }

  private buscarFaturas(pagina: number): Observable<{ content: PedidoVenda[]; temMais: boolean }> {
    const f = this.filtrosBusca;
    if (f.tipo === 'pedido') {
      return of({ content: [], temMais: false });
    }
    return this.ordemCarregamentoService.searchFaturas(f.dataInicial, f.dataFinal, f.filial, f.localidade, f.vendedor, f.cidade, pagina);
  }

  private naoSelecionados(documentos: PedidoVenda[]): PedidoVenda[] {
    const selecionados = new Set(this.selectedOrders.map(chaveSelecao));
    return documentos.filter(doc => !selecionados.has(chaveSelecao(doc)));
  }

  onSelectedOrdersChange(orders: PedidoVenda[]): void {
    this.selectedOrders = orders;
    this.updateOrderName(); 
  }

  selectOriginSalesPerson(sp: SalesPerson | null): void {
    this.vendedor = sp?.SalesEmployeeCode ?? null;
  }

  // O dual-list-box busca o estoque em carregamento quando showStock liga.
  toggleEstoque(): void {
    this.showStock = !this.showStock;
  }

  validateForm(): boolean {
    if (Number(this.ordemCarregamento.U_capacidadeCaminhao) < 0) {
      this.alertService.error('A capacidade do caminhão não pode ser negativa.');
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

      const isCreation = !this.ordemCarregamento.DocEntry; 

      const pedidos = this.selectedOrders.filter(p => !isFaturaReserva(p));
      const toRemove = this.initialSelectedOrders
        .filter(initial => !isFaturaReserva(initial))
        .filter(initial => !pedidos.some(current => current.DocEntry == initial.DocEntry))
        .map(p => p.DocEntry);

      // Fatura de reserva sai aos poucos: manda linha e quantidade; o backend confere o saldo.
      const faturasReserva = this.selectedOrders
        .filter(p => isFaturaReserva(p) && Number(p.Quantity) > 0)
        .map(p => ({ docEntry: Number(p.DocEntry), lineNum: Number(p.BaseLine), quantidade: Number(p.Quantity) }));

      const dto = new OrdemCarregamentoDto(
        this.ordemCarregamento,
        pedidos.map(pedido => pedido.DocEntry),
        toRemove,
        faturasReserva
      )

      this.ordemCarregamentoService.save(dto).subscribe({
        next: (it) => {
          if (it) {
              this.ordemCarregamento = it;
          }
          this.concluirEnvio(isCreation);
        },
        error: (err) => {
          console.error(err);
          this.alertService.error(err?.error?.message || 'Erro ao salvar a ordem.');
          this.loading = false;
        }
      });
  }

  private concluirEnvio(isCreation: boolean): void {
      const acao = isCreation ? 'criada' : 'atualizada';

      this.alertService.info(`Ordem de carregamento ${acao} com sucesso.`).then(() => {
        this.loading = false;
        
        this.router.navigate(['/logistica/ordem-carregamento'], {
          queryParams: { id: this.ordemCarregamento.DocEntry } 
        });
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

    this.applyDefaultDates();
    this.selectedOrders = [];
    this.initialSelectedOrders = [];
  }

  // Busca padrao: ultimo mes ate hoje, criando ou editando. Data local (toISOString virava o dia a noite).
  private applyDefaultDates(): void {
    this.dtInicial ??= moment().subtract(1, 'month').format('YYYY-MM-DD');
    this.dtFinal ??= moment().format('YYYY-MM-DD');
  }

goBack(): void {
    const params = this.route.snapshot.queryParams;
    if (params['id'] && params['edit']) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { edit: null }, 
        queryParamsHandling: 'merge' 
      });
    } 
    else {
      this.back.emit(); 
    }
  }
}
