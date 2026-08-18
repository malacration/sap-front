import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
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

  filiaisSelecionadas: Branch[] = [];
  clienteSelecionado: any | null = null;
  vendedorSelecionado: SalesPerson | null = null;

  // Referencia estavel de proposito: o app-select zera a selecao a cada nova referencia
  // recebida, entao isso so pode trocar quando a intencao e mesmo redefinir o filtro
  // (drill-down do dashboard ou "Limpar"), nunca a cada change detection.
  filiaisHerdadas: Array<string | number> = [];

  filtroTipo = '';
  filtroStatus = '';
  filtroSituacao = '';
  filtroSituacaoSap = 'ABERTO';
  filtroCobrador = '';
  filtroDiasAtrasoMin: number | null = 1;
  filtroVencimentoDe = '';
  filtroVencimentoAte = '';

  filtroSemAcompanhamento: boolean | null = null;
  filtroPromessaVencidaAte = '';
  vendedorHerdado: number | null = null;
  veioDoDashboard = false;

  private readonly filtroSolicitado = new Subject<void>();

  constructor(
    private auth: AuthService,
    private service: CobrancaService,
    private route: ActivatedRoute,
  ) {
    this.nomeUsuario = this.auth.getUser();
    this.definition = this.service.getDefinition();

    const hoje = new Date();
    this.filtroVencimentoDe = this.paraInput(this.somarDias(hoje, -30));
    this.filtroVencimentoAte = this.paraInput(new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()));
    this.filtroDiasAtrasoMin = null;
  }

  ngOnInit(): void {
    // switchMap: cada filial marcada dispara um filtrar(), e o menu fica aberto de propósito,
    // então 4 filiais = 4 requisições em voo. Sem cancelar, quem manda no resultado é a última
    // RESPOSTA e não a última requisição - dava pra ficar com as linhas de uma filial só na
    // tela com todos os checkboxes marcados. Precisa vir antes do queryParams, que já filtra.
    this.filtroSolicitado.pipe(
      switchMap(() => {
        this.loading = true;
        this.paginaAtual = 0;
        return this.service.listar({ ...this.getFiltro(), pagina: 0, tamanho: this.pageSize })
          // catchError dentro do switchMap: se propagar, mata o Subject e a tela nunca mais
          // filtra. O erro em si o interceptor global já notifica.
          .pipe(catchError(() => of([] as CobrancaTitulo[])));
      })
    ).subscribe((titulos) => {
      this.titulos = titulos;
      this.temMais = titulos.length === this.pageSize;
      this.loading = false;
    });

    forkJoin({
      status: this.service.dominios('STATUS'),
      acao: this.service.dominios('ACAO'),
      situacao: this.service.dominios('SITUACAO'),
      ocorrencia: this.service.dominios('OCORRENCIA'),
    }).subscribe((dominios) => {
      this.dominios = dominios;
    });

    this.service.cobradores().subscribe((cobradores) => {
      this.cobradoresDisponiveis = cobradores;
    });

    this.route.queryParams.subscribe((params) => {
      this.aplicarParametrosDeNavegacao(params);
      this.filtrar();
    });
  }

  filtrosHerdados(): string[] {
    const partes: string[] = [];
    const filiais = this.idsDasFiliais();
    if (filiais.length === 1) {
      partes.push(`Filial ${filiais[0]}`);
    } else if (filiais.length > 1) {
      partes.push(`Filiais ${filiais.join(', ')}`);
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

  filtrar(): void {
    this.filtroSolicitado.next();
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
      // Observable com erro nao emite complete: sem isso o botao ficava "Carregando..."
      // desabilitado pra sempre depois de uma falha.
      error: () => {
        this.carregandoMais = false;
      },
      complete: () => {
        this.carregandoMais = false;
      }
    });
  }

  limparFiltros(): void {
    this.filiaisSelecionadas = [];
    this.filiaisHerdadas = [];
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

  onFilialChange(branches: Branch[]): void {
    this.filiaisSelecionadas = branches ?? [];
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

  // Carregado do backend no ngOnInit. Antes era derivado de `titulos`, o que era circular:
  // só dava pra filtrar por um cobrador cujos títulos já estivessem na página carregada.
  cobradoresDisponiveis: string[] = [];

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

  private aplicarParametrosDeNavegacao(params: Record<string, any>): void {
    this.veioDoDashboard = params.origem === 'resultado';
    if (!this.veioDoDashboard) {
      return;
    }

    if (params.filial) {
      const filial = new Branch();
      filial.Bplid = params.filial;
      this.filiaisSelecionadas = [filial];
      this.filiaisHerdadas = [params.filial];
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
    this.filtroVencimentoDe = params.vencimentoDe || '';
    this.filtroVencimentoAte = params.vencimentoAte || '';
    if (params.semAcompanhamento === 'true') {
      this.filtroSemAcompanhamento = true;
    }
    if (params.promessaVencidaAte) {
      this.filtroPromessaVencidaAte = params.promessaVencidaAte;
    }
    if (params.vencimentoDe || params.vencimentoAte) {
      this.filtroDiasAtrasoMin = null;
    }
  }

  private idsDasFiliais(): number[] {
    return this.filiaisSelecionadas
      .map((filial) => filial?.Bplid ?? filial?.BPLID)
      // Bplid é string e o SAP devolve string vazia pra campo não preenchido: `Number('')` é 0,
      // que passa por !isNaN e vira filial=0 - filial que não existe, resultado vazio em silêncio.
      .filter((id) => id != null && `${id}`.trim() !== '')
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
  }

  private getFiltro(): CobrancaFiltro {
    return {
      filial: this.idsDasFiliais(),
      cliente: this.clienteSelecionado?.CardCode ?? null,
      vendedor: this.vendedorSelecionado?.SalesEmployeeCode != null
        ? Number(this.vendedorSelecionado.SalesEmployeeCode)
        : this.vendedorHerdado,
      tipo: this.filtroTipo || null,
      status: this.filtroStatus || null,
      // "1 - NÃO INICIADO" é o rótulo que a tela mostra pra U_Status vazio: sem avisar o
      // backend, esse filtro procura o texto literal na UDT e não acha nada.
      incluirSemStatus: this.filtroStatus === CobrancaTitulo.STATUS_NAO_INICIADO ? true : null,
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
