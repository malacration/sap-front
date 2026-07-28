import { Component, OnInit, ViewChild } from '@angular/core';
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

  constructor(
    private auth: AuthService,
    private service: CobrancaService,
  ) {
    this.nomeUsuario = this.auth.getUser();
    this.definition = this.service.getDefinition();
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

    this.filtrar();
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

  private getFiltro(): CobrancaFiltro {
    return {
      filial: this.filialSelecionada?.Bplid != null ? Number(this.filialSelecionada.Bplid) : null,
      cliente: this.clienteSelecionado?.CardCode ?? null,
      vendedor: this.vendedorSelecionado?.SalesEmployeeCode != null
        ? Number(this.vendedorSelecionado.SalesEmployeeCode)
        : null,
      tipo: this.filtroTipo || null,
      status: this.filtroStatus || null,
      situacao: this.filtroSituacao || null,
      situacaoSap: this.filtroSituacaoSap || null,
      cobrador: this.filtroCobrador || null,
      diasAtrasoMin: this.filtroDiasAtrasoMin ?? null,
      vencimentoDe: this.filtroVencimentoDe || null,
      vencimentoAte: this.filtroVencimentoAte || null,
    };
  }
}
