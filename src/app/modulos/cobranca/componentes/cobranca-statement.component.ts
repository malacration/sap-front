import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../shared/service/auth.service';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { Column } from '../../../shared/components/table/column.model';
import { CobrancaTitulo } from '../../../sap/model/cobranca/cobranca-titulo';
import { Branch } from '../../../sap/model/branch';
import { SalesPerson } from '../../../sap/model/sales-person/sales-person';
import { CobrancaFiltro, CobrancaService } from '../../../sap/service/cobranca/cobranca.service';
import { RegistrarAcaoModalComponent, CobrancaDominios } from './registrar-acao-modal.component';
import { Option, OptionGroup } from '../../../sap/model/form/option';

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
  filtroVencimentoDe = '';
  filtroVencimentoAte = '';
  // Meses de lançamento escolhidos (YYYY-MM). Vazio = qualquer mês.
  filtroLancamentoMeses: string[] = [];
  // Única representação dos meses: agrupada por ano, do jeito que o app-select consome no modo
  // multiple agrupado.
  mesesPorAno: OptionGroup[] = [];

  filtroSemAcompanhamento: boolean | null = null;
  filtroPromessaVencidaAte = '';
  vendedorHerdado: number | null = null;
  veioDoDashboard = false;

  // Carrega a lista e, opcionalmente, os códigos que devem voltar marcados nessa carga. Os
  // códigos viajam com a requisição de propósito: em campo, guardá-los num atributo fazia a
  // remarcação cair na próxima emissão, que pode ser de outro filtro que o usuário mexeu no meio.
  private readonly filtroSolicitado = new Subject<string[]>();

  // Vencimento padrão (30 dias atrás → 1 mês à frente) é só o recorte inicial da tela. Escolher
  // mês de lançamento sem ter mexido nessas datas limpa o recorte: senão o filtro oferece 24
  // meses e só os ~2 do recorte trazem linha, sem nada na tela explicando o porquê.
  private vencimentoIntocado = true;

  constructor(
    private auth: AuthService,
    private service: CobrancaService,
    private route: ActivatedRoute,
  ) {
    this.nomeUsuario = this.auth.getUser();
    this.definition = this.service.getDefinition();

    const hoje = new Date();
    this.mesesPorAno = this.montarMesesPorAno(hoje);
    this.filtroVencimentoDe = this.paraInput(this.somarDias(hoje, -30));
    this.filtroVencimentoAte = this.paraInput(this.umMesAFrente(hoje));
  }

  ngOnInit(): void {
    // switchMap: cada filial marcada dispara um filtrar(), e o menu fica aberto de propósito,
    // então 4 filiais = 4 requisições em voo. Sem cancelar, quem manda no resultado é a última
    // RESPOSTA e não a última requisição - dava pra ficar com as linhas de uma filial só na
    // tela com todos os checkboxes marcados. Precisa vir antes do queryParams, que já filtra.
    this.filtroSolicitado.pipe(
      switchMap((codigosParaRemarcar) => {
        this.loading = true;
        this.paginaAtual = 0;
        return this.service.listar({ ...this.getFiltro(), pagina: 0, tamanho: this.pageSize })
          // catchError dentro do switchMap: se propagar, mata o Subject e a tela nunca mais
          // filtra. O erro em si o interceptor global já notifica.
          .pipe(
            catchError(() => of([] as CobrancaTitulo[])),
            map((titulos) => ({ titulos, codigosParaRemarcar })),
          );
      })
    ).subscribe(({ titulos, codigosParaRemarcar }) => {
      this.titulos = titulos;
      this.remarca(codigosParaRemarcar);
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
    if (this.filtroLancamentoMeses.length === 1) {
      partes.push(`lançamento em ${this.rotuloDoMes(this.filtroLancamentoMeses[0])}`);
    } else if (this.filtroLancamentoMeses.length > 1) {
      partes.push(`lançamento em ${this.filtroLancamentoMeses.length} meses`);
    }
    if (this.filtroStatus) {
      partes.push(`status ${this.filtroStatus}`);
    }
    if (this.filtroCobrador) {
      partes.push(`cobrador ${this.filtroCobrador}`);
    }
    return partes;
  }

  filtrar(codigosParaRemarcar: string[] = []): void {
    this.filtroSolicitado.next(codigosParaRemarcar);
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
    this.zerarFiltros();
    this.filtrar();
  }

  /**
   * Volta a tela ao estado inicial. Separado do limparFiltros porque "Minhas cobranças" também
   * usa: lá o reset acontece antes de marcar o cobrador.
   */
  private zerarFiltros(): void {
    this.filiaisSelecionadas = [];
    this.filiaisHerdadas = [];
    this.clienteSelecionado = null;
    this.vendedorSelecionado = null;
    this.filtroTipo = '';
    this.filtroStatus = '';
    this.filtroSituacao = '';
    this.filtroSituacaoSap = 'ABERTO';
    this.filtroCobrador = '';
    this.filtroVencimentoDe = '';
    this.filtroVencimentoAte = '';
    this.vencimentoIntocado = true;
    this.filtroLancamentoMeses = [];
    this.filtroSemAcompanhamento = null;
    this.filtroPromessaVencidaAte = '';
    this.vendedorHerdado = null;
    this.veioDoDashboard = false;
  }

  onMesesChange(meses: string[]): void {
    this.filtroLancamentoMeses = meses ?? [];
    if (this.filtroLancamentoMeses.length > 0 && this.vencimentoIntocado) {
      this.filtroVencimentoDe = '';
      this.filtroVencimentoAte = '';
    }
    this.filtrar();
  }

  onVencimentoChange(): void {
    this.vencimentoIntocado = false;
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

  /**
   * Atalho pra "só o que é meu": ligar limpa todo o resto, senão o filtro anterior (filial, mês,
   * status da tela de onde o cobrador veio) continua escondendo parte das cobranças dele.
   *
   * Desligar só solta o cobrador e deixa os outros filtros como estão - quem marcou algo depois
   * de ligar não perde o que escolheu.
   */
  minhasCobrancas(): void {
    if (this.filtroCobrador === this.nomeUsuario) {
      this.filtroCobrador = '';
      this.filtrar();
      return;
    }
    this.zerarFiltros();
    this.filtroCobrador = this.nomeUsuario;
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

  // Remover uma anotação recarrega a grade (o cabeçalho do título acompanha a última ação), mas
  // não é "ação registrada": a seleção de lote que o cobrador montou continua valendo, e por isso
  // as parcelas marcadas são remarcadas depois que a lista volta. A recarga volta pra página 1,
  // então parcela marcada que estava numa página seguinte se perde - é o limite conhecido daqui.
  onHistoricoRemovido(): void {
    this.filtrar(this.selecionados.map((titulo) => titulo.code));
  }

  private remarca(codigos: string[]): void {
    if (codigos.length === 0) {
      return;
    }
    this.titulos.forEach((titulo) => {
      titulo.selecionado = codigos.includes(titulo.code);
    });
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
      vencimentoDe: this.filtroVencimentoDe || null,
      // Array: montarParams manda repetido (lancamentoMes=2026-07&lancamentoMes=2026-08), que é
      // como o Spring lê List<String> - mesmo caminho da multi-seleção de filial.
      lancamentoMes: this.filtroLancamentoMeses,
      vencimentoAte: this.filtroVencimentoAte || null,
      semAcompanhamento: this.filtroSemAcompanhamento,
      promessaVencidaAte: this.filtroPromessaVencidaAte || null,
    };
  }

  private static readonly NOMES_DOS_MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  /**
   * Os 24 meses que o filtro oferece, do mais recente pro mais antigo, agrupados por ano. O ano
   * é o cabeçalho do grupo na árvore, então o rótulo do mês é só o nome ("Julho"); o valor
   * continua YYYY-MM, que é o que o backend espera.
   *
   * O ano da ponta entra incompleto de propósito (com a janela de 24 meses, 2024 começa em
   * setembro): a árvore mostra só o que existe na janela.
   */
  private montarMesesPorAno(hoje: Date): OptionGroup[] {
    const grupos: OptionGroup[] = [];
    for (let atras = 0; atras < 24; atras++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - atras, 1);
      const mes = `${data.getMonth() + 1}`.padStart(2, '0');
      const ano = `${data.getFullYear()}`;
      let grupo = grupos.find((item) => item.label === ano);
      if (!grupo) {
        grupo = new OptionGroup(ano, []);
        grupos.push(grupo);
      }
      // O ano é o rótulo do grupo, então a opção mostra só o nome do mês; o valor é o YYYY-MM
      // que o backend faz parse.
      grupo.options.push(
        new Option(`${ano}-${mes}`, CobrancaStatementComponent.NOMES_DOS_MESES[data.getMonth()]),
      );
    }
    return grupos;
  }

  private rotuloDoMes(valor: string): string {
    const grupo = this.mesesPorAno.find((item) => item.options.some((mes) => mes.value === valor));
    const mes = grupo?.options.find((item) => item.value === valor);
    return mes ? `${mes.description}/${grupo?.label}` : valor;
  }

  private paraInput(data: Date): string {
    const mes = `${data.getMonth() + 1}`.padStart(2, '0');
    const dia = `${data.getDate()}`.padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * `new Date(ano, mes + 1, dia)` transborda pro mês seguinte quando o dia não existe no destino:
   * em 31/01 dava 03/03. Aqui o dia é limitado ao último dia do mês de destino (31/01 → 28/02).
   */
  private umMesAFrente(hoje: Date): Date {
    const ultimoDiaDoDestino = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0).getDate();
    return new Date(hoje.getFullYear(), hoje.getMonth() + 1, Math.min(hoje.getDate(), ultimoDiaDoDestino));
  }

  private somarDias(data: Date, dias: number): Date {
    const nova = new Date(data.getTime());
    nova.setDate(nova.getDate() + dias);
    return nova;
  }
}
