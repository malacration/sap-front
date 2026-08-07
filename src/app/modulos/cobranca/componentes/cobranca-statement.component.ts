import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../shared/service/auth.service';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { Column } from '../../../shared/components/table/column.model';
import { CobrancaTitulo } from '../../../sap/model/cobranca/cobranca-titulo';
import { Branch } from '../../../sap/model/branch';
import { SalesPerson } from '../../../sap/model/sales-person/sales-person';
import { CobrancaFiltro, CobrancaService } from '../../../sap/service/cobranca/cobranca.service';
import { RegistrarAcaoModalComponent, CobrancaDominios } from './registrar-acao-modal.component';

@Component({
  selector: 'app-cobranca-statement',
  templateUrl: './cobranca-statement.component.html',
  styleUrls: ['./cobranca-statement.component.scss']
})
export class CobrancaStatementComponent implements OnInit {

  @ViewChild(RegistrarAcaoModalComponent)
  modal: RegistrarAcaoModalComponent;

  nomeUsuario: string;
  loading = false;
  carregandoMais = false;

  titulos: CobrancaTitulo[] = [];
  definition: Column[] = [];

  paginaAtual = 0;
  readonly pageSize = 20;
  temMais = false;

  dominios: CobrancaDominios = { status: [], acao: [], situacao: [], ocorrencia: [] };

  filialSelecionada: Branch | null = null;
  clienteSelecionado: any | null = null;
  vendedorSelecionado: SalesPerson | null = null;

  filtroTipo = ''; // '' = Todos, 'NF' = Nota Fiscal, 'AD' = Adiantamento
  filtroStatus = '';
  filtroSituacao = '';
  // Titulos ja quitados continuam aparecendo (baixa automatica via SituacaoSap, ver
  // "OR C.Code IS NOT NULL" na view) para mostrar que o acompanhamento virou PAGO -
  // mas isso nao deve poluir a lista por padrao, so quando o usuario pedir "Todos"/"Pago".
  filtroSituacaoSap = 'ABERTO';
  filtroCobrador = '';
  // Padrao 1: sem isso, parcela que vence hoje (0 dias de atraso) tambem aparece.
  filtroDiasAtrasoMin: number | null = 1;
  filtroVencimentoDe = '';
  filtroVencimentoAte = '';

  // Só chegam por navegação a partir do dashboard - não têm controle próprio na tela, e por
  // isso aparecem listados na faixa do topo enquanto estiverem valendo.
  filtroSemAcompanhamento: boolean | null = null;
  filtroPromessaVencidaAte = '';
  vendedorHerdado: number | null = null;
  veioDoDashboard = false;

  constructor(
    private auth: AuthService,
    private service: CobrancaService,
    private route: ActivatedRoute,
  ) {
    this.nomeUsuario = this.auth.getUser();
    this.definition = this.service.getDefinition();

    // Padrao de entrada direta na tela (sem vir de drill-down do dashboard): uma janela de
    // vencimento em vez de "tudo em atraso", que sem filtro nenhum costuma virar uma lista
    // gigante. aplicarParametrosDeNavegacao() sobrescreve isso quando vem do dashboard.
    const hoje = new Date();
    this.filtroVencimentoDe = this.paraInput(this.somarDias(hoje, -30));
    this.filtroVencimentoAte = this.paraInput(new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()));
    // A janela ja inclui vencimento futuro (proximo mes); o minimo de dias em atraso (default 1)
    // cortaria justamente essa parte, igual ja acontece no drill-down por faixa/vencimento.
    this.filtroDiasAtrasoMin = null;
  }

  ngOnInit(): void {
    forkJoin({
      status: this.service.dominios('STATUS'),
      acao: this.service.dominios('ACAO'),
      situacao: this.service.dominios('SITUACAO'),
      ocorrencia: this.service.dominios('OCORRENCIA'),
    }).subscribe((dominios) => {
      this.dominios = dominios;
    });

    // O callback é o ÚNICO lugar que dispara carga, inclusive quando não veio parâmetro
    // nenhum — subscrever e também chamar filtrar() aqui buscaria a lista duas vezes.
    // Mesmo formato de modulos/ordem-carregamento/componentes/statement.ts.
    this.route.queryParams.subscribe((params) => {
      this.aplicarParametrosDeNavegacao(params);
      this.filtrar();
    });
  }

  // Texto do que veio pela URL, para nenhum filtro ficar aplicado sem estar escrito na tela.
  filtrosHerdados(): string[] {
    const partes: string[] = [];
    if (this.filialSelecionada?.Bplid != null) {
      partes.push(`Filial ${this.filialSelecionada.Bplid}`);
    }
    if (this.vendedorHerdado != null) {
      partes.push(`Vendedor ${this.vendedorHerdado}`);
    }
    if (this.filtroSemAcompanhamento) {
      partes.push('sem nenhuma ação registrada');
    }
    if (this.filtroPromessaVencidaAte) {
      partes.push(`promessa vencida até ${this.filtroPromessaVencidaAte}`);
    }
    if (this.filtroVencimentoDe || this.filtroVencimentoAte) {
      partes.push(`vencimento ${this.filtroVencimentoDe || '...'} a ${this.filtroVencimentoAte || '...'}`);
    }
    if (this.filtroStatus) {
      partes.push(`status ${this.filtroStatus}`);
    }
    if (this.filtroCobrador) {
      partes.push(`cobrador ${this.filtroCobrador}`);
    }
    return partes;
  }

  // O backend pagina no SAP (nao busca tudo de uma vez), entao aqui e "carregar mais"
  // acumulando no array, e nao paginas numeradas com total conhecido de antemao.
  filtrar(): void {
    this.loading = true;
    this.paginaAtual = 0;
    this.service.listar({ ...this.getFiltro(), pagina: 0, tamanho: this.pageSize }).subscribe({
      next: (titulos) => {
        this.titulos = titulos;
        this.temMais = titulos.length === this.pageSize;
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  carregarMais(): void {
    this.carregandoMais = true;
    const proximaPagina = this.paginaAtual + 1;
    this.service.listar({ ...this.getFiltro(), pagina: proximaPagina, tamanho: this.pageSize }).subscribe({
      next: (titulos) => {
        this.titulos = [...this.titulos, ...titulos];
        this.paginaAtual = proximaPagina;
        this.temMais = titulos.length === this.pageSize;
        this.carregandoMais = false;
      },
      complete: () => {
        this.carregandoMais = false;
      }
    });
  }

  limparFiltros(): void {
    this.filialSelecionada = null;
    this.clienteSelecionado = null;
    this.vendedorSelecionado = null;
    this.filtroTipo = '';
    this.filtroStatus = '';
    this.filtroSituacao = '';
    this.filtroSituacaoSap = 'ABERTO';
    this.filtroCobrador = '';
    this.filtroDiasAtrasoMin = 1;
    this.filtroVencimentoDe = '';
    this.filtroVencimentoAte = '';
    this.filtroSemAcompanhamento = null;
    this.filtroPromessaVencidaAte = '';
    this.vendedorHerdado = null;
    this.veioDoDashboard = false;
    this.filtrar();
  }

  onFilialChange(branch: Branch): void {
    this.filialSelecionada = branch ?? null;
    this.filtrar();
  }

  onClienteChange(parceiro: any): void {
    this.clienteSelecionado = parceiro ?? null;
    this.filtrar();
  }

  onVendedorChange(vendedor: SalesPerson): void {
    this.vendedorSelecionado = vendedor ?? null;
    this.filtrar();
  }

  minhasCobrancas(): void {
    this.filtroCobrador = this.filtroCobrador === this.nomeUsuario ? '' : this.nomeUsuario;
    this.filtrar();
  }

  get cobradoresDisponiveis(): string[] {
    const cobradores = this.titulos.map((t) => t.U_Cobrador).filter((c) => !!c);
    return Array.from(new Set(cobradores)).sort();
  }

  get selecionados(): CobrancaTitulo[] {
    return this.titulos.filter((t) => t.selecionado);
  }

  get todosSelecionados(): boolean {
    return this.titulos.length > 0 && this.titulos.every((t) => t.selecionado);
  }

  alternarSelecaoTodos(): void {
    const novoValor = !this.todosSelecionados;
    this.titulos.forEach((t) => (t.selecionado = novoValor));
  }

  action(event: ActionReturn): void {
    if (event.type === 'cobranca-toggle-selecao') {
      const titulo = event.data as CobrancaTitulo;
      titulo.selecionado = !titulo.selecionado;
    } else if (event.type === 'cobranca-registrar') {
      this.modal.abrir([event.data as CobrancaTitulo]);
    } else if (event.type === 'cobranca-historico') {
      this.modal.abrirHistorico(event.data as CobrancaTitulo);
    }
  }

  abrirLote(): void {
    if (this.selecionados.length === 0) {
      return;
    }
    this.modal.abrir(this.selecionados);
  }

  onSalvo(): void {
    this.titulos.forEach((t) => (t.selecionado = false));
    this.filtrar();
  }

  // Vindo do dashboard (/cobranca/resultado), o filtro chega pela URL. Dois desses filtros não
  // têm controle na tela e o vendedor não pode ser pré-selecionado (app-sales-person-search não
  // tem @Input) - por isso o que chegou aqui é escrito na faixa do topo, via filtrosHerdados().
  private aplicarParametrosDeNavegacao(params: Record<string, any>): void {
    this.veioDoDashboard = params.origem === 'resultado';
    if (!this.veioDoDashboard) {
      return;
    }

    if (params.filial) {
      // filialSelecionada é lida só via ?.Bplid (template e getFiltro), então preencher só o id
      // é funcionalmente completo - e o app-branch-select resolve o nome pelo id sozinho.
      const filial = new Branch();
      filial.Bplid = params.filial;
      this.filialSelecionada = filial;
    }
    if (params.vendedor) {
      this.vendedorHerdado = Number(params.vendedor);
    }
    if (params.situacaoSap != null) {
      this.filtroSituacaoSap = params.situacaoSap;
    }
    if (params.status) {
      this.filtroStatus = params.status;
    }
    if (params.cobrador) {
      this.filtroCobrador = params.cobrador;
    }
    // Drill-down do dashboard sem vencimento explícito quer o recorte inteiro (ex.: carteira
    // completa em atraso), não a janela padrão de entrada direta na tela - por isso limpa em
    // vez de manter o valor do construtor.
    this.filtroVencimentoDe = params.vencimentoDe || '';
    this.filtroVencimentoAte = params.vencimentoAte || '';
    if (params.semAcompanhamento === 'true') {
      this.filtroSemAcompanhamento = true;
    }
    if (params.promessaVencidaAte) {
      this.filtroPromessaVencidaAte = params.promessaVencidaAte;
    }
    // A faixa de atraso já vem como janela de vencimento; manter o mínimo de dias junto
    // apertaria o filtro duas vezes e faria a lista discordar do card.
    if (params.vencimentoDe || params.vencimentoAte) {
      this.filtroDiasAtrasoMin = null;
    }
  }

  private getFiltro(): CobrancaFiltro {
    return {
      filial: this.filialSelecionada?.Bplid != null ? Number(this.filialSelecionada.Bplid) : null,
      cliente: this.clienteSelecionado?.CardCode ?? null,
      // O vendedor escolhido na tela ganha do herdado pela URL: se a pessoa mexer no campo,
      // é isso que ela quer, mesmo tendo chegado aqui por drill-down.
      vendedor: this.vendedorSelecionado?.SalesEmployeeCode != null
        ? Number(this.vendedorSelecionado.SalesEmployeeCode)
        : this.vendedorHerdado,
      tipo: this.filtroTipo || null,
      status: this.filtroStatus || null,
      situacao: this.filtroSituacao || null,
      situacaoSap: this.filtroSituacaoSap || null,
      cobrador: this.filtroCobrador || null,
      diasAtrasoMin: this.filtroDiasAtrasoMin ?? null,
      vencimentoDe: this.filtroVencimentoDe || null,
      vencimentoAte: this.filtroVencimentoAte || null,
      semAcompanhamento: this.filtroSemAcompanhamento,
      promessaVencidaAte: this.filtroPromessaVencidaAte || null,
    };
  }

  private paraInput(data: Date): string {
    const mes = `${data.getMonth() + 1}`.padStart(2, '0');
    const dia = `${data.getDate()}`.padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
  }

  private somarDias(data: Date, dias: number): Date {
    const nova = new Date(data.getTime());
    nova.setDate(nova.getDate() + dias);
    return nova;
  }
}
