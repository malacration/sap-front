import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, EMPTY, forkJoin } from 'rxjs';
import { catchError, debounceTime, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { Branch } from '../../../../sap/model/branch';
import { KPI_DOCS } from '../../modelos/kpi-doc';
import { SalesPerson } from '../../../../sap/model/sales-person/sales-person';
import {
  GranularidadePainelVendas,
  PainelVendasV2Erro,
  PainelVendasV2Evolucao,
  PainelVendasV2Filtro,
  PainelVendasV2Kpis,
} from '../../modelos/painel-vendas-v2.model';
import { PainelVendasV2Service } from '../../service/painel-vendas-v2.service';

interface PontoGrafico {
  name: string;
  value: number;
}

interface SerieGrafico {
  name: string;
  series: PontoGrafico[];
}

@Component({
  selector: 'app-painel-vendas-v2',
  templateUrl: './painel-vendas-v2.component.html',
  styleUrls: ['./painel-vendas-v2.component.scss'],
})
export class PainelVendasV2Component implements OnInit, OnDestroy {
  dataInicio: string;
  dataFim: string;
  granularidade: GranularidadePainelVendas = 'DIA';
  ids: Array<string | number> = [];

  kpis: PainelVendasV2Kpis | null = null;
  evolucao: PainelVendasV2Evolucao[] = [];
  graficoFaturamento: SerieGrafico[] = [];
  graficoFaturas: PontoGrafico[] = [];

  carregando = false;
  erro: string | null = null;
  erroValidacao: string | null = null;

  private filiaisSelecionadas: number[] = [];
  private slpCode: number | undefined;
  private readonly filtrosAlterados = new Subject<void>();
  private readonly destruir = new Subject<void>();
  private readonly limites: Record<GranularidadePainelVendas, number> = {
    DIA: 92,
    SEMANA: 366,
    MES: 1096,
  };
  private readonly formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  private readonly formatadorInteiro = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  });

  constructor(private painelVendasService: PainelVendasV2Service) {
    const hoje = new Date();
    this.dataFim = this.paraDataIso(hoje);
    this.dataInicio = this.paraDataIso(this.somarDias(hoje, -30));
  }

  ngOnInit(): void {
    this.filtrosAlterados
      .pipe(
        debounceTime(450),
        map(() => this.montarFiltro()),
        switchMap((filtro) => this.consultar(filtro)),
        takeUntil(this.destruir)
      )
      .subscribe(({ kpis, evolucao }) => {
        this.kpis = kpis;
        this.evolucao = evolucao;
        this.montarGraficos(evolucao);
      });

    this.aoAlterarFiltro();
  }

  ngOnDestroy(): void {
    this.destruir.next();
    this.destruir.complete();
  }

  aoAlterarFiltro(): void {
    this.erroValidacao = this.validarFiltro(this.montarFiltro());
    this.erro = null;
    if (this.erroValidacao) {
      this.limparResultado();
    }
    this.filtrosAlterados.next();
  }

  /** Id da filial -> nome, para exibir o escopo por extenso em vez do numero. */
  nomesFiliais = new Map<number, string>();

  aoSelecionarFiliais(filiais: Branch[]): void {
    const ids = (filiais ?? [])
      .map((filial) => Number(filial.Bplid ?? filial.BPLID))
      .filter((id) => Number.isFinite(id));
    (filiais ?? []).forEach((filial) => {
      const id = Number(filial.Bplid ?? filial.BPLID);
      const nome = filial.Bplname ?? filial.BPLName;
      if (Number.isFinite(id) && nome) {
        this.nomesFiliais.set(id, nome);
      }
    });
    this.filiaisSelecionadas = Array.from(new Set(ids));
    this.ids = [...this.filiaisSelecionadas];
    this.aoAlterarFiltro();
  }

  aoSelecionarVendedor(vendedor: SalesPerson | null | undefined): void {
    const codigo = vendedor == null ? NaN : Number(vendedor.SalesEmployeeCode);
    this.slpCode = Number.isFinite(codigo) ? codigo : undefined;
    this.aoAlterarFiltro();
  }

  /** Nome da filial quando conhecido; o id cru so como ultimo recurso. */
  rotuloFilial(id: number): string {
    const nome = this.nomesFiliais.get(id);
    return nome ? `${id} - ${nome}` : String(id);
  }

  /** Texto do tooltip de documentacao do KPI. */
  tooltipKpi(chave: string): string {
    const doc = KPI_DOCS[chave];
    if (!doc) {
      return '';
    }
    const partes = [doc.formula, doc.detalhe];
    if (doc.ressalva) {
      partes.push('Atenção: ' + doc.ressalva);
    }
    return partes.join(' — ');
  }

  formatarMoeda(valor: number | null): string {
    return valor == null || !Number.isFinite(valor) ? '—' : this.formatadorMoeda.format(valor);
  }

  formatarQuantidade(valor: number): string {
    return this.formatadorInteiro.format(valor);
  }

  formatarEixoMoeda = (valor: number): string =>
    this.formatadorMoeda.format(valor).replace(/\u00a0/g, ' ');

  descricaoVendedores(): string {
    if (!this.kpis) return '';
    if (this.kpis.escopo.todosVendedores) return 'Todos os vendedores';
    if (this.kpis.escopo.vendedor != null) {
      return `Vendedor ${this.kpis.escopo.vendedor}`;
    }
    return 'Escopo restrito de vendedor';
  }

  private consultar(filtro: PainelVendasV2Filtro) {
    const erroValidacao = this.validarFiltro(filtro);
    this.erroValidacao = erroValidacao;

    if (erroValidacao) {
      this.carregando = false;
      return EMPTY;
    }

    this.carregando = true;
    this.erro = null;
    this.limparResultado();

    return forkJoin({
      kpis: this.painelVendasService.getKpis(filtro),
      evolucao: this.painelVendasService.getEvolucao(filtro),
    }).pipe(
      // Cancela imediatamente a consulta corrente ao primeiro evento de filtro;
      // o debounce continua decidindo quando a proxima consulta pode comecar.
      takeUntil(this.filtrosAlterados),
      catchError((erro: HttpErrorResponse) => {
        this.erro = this.mensagemDeErro(erro);
        this.limparResultado();
        return EMPTY;
      }),
      finalize(() => {
        this.carregando = false;
      })
    );
  }

  private montarFiltro(): PainelVendasV2Filtro {
    return {
      dataInicio: this.dataInicio,
      dataFim: this.dataFim,
      filiais: this.filiaisSelecionadas.length ? [...this.filiaisSelecionadas] : undefined,
      slpCode: this.slpCode,
      granularidade: this.granularidade,
    };
  }

  private validarFiltro(filtro: PainelVendasV2Filtro): string | null {
    if (!filtro.dataInicio || !filtro.dataFim) {
      return 'Informe as datas inicial e final do período.';
    }

    const inicio = this.dataIsoEmUtc(filtro.dataInicio);
    const fim = this.dataIsoEmUtc(filtro.dataFim);
    if (inicio == null || fim == null) {
      return 'Informe um período válido.';
    }
    if (inicio > fim) {
      return 'A data inicial não pode ser posterior à data final.';
    }

    const dias = Math.floor((fim - inicio) / 86400000);
    const limite = this.limites[filtro.granularidade];
    if (dias > limite) {
      return `O período de ${dias} dias excede o máximo de ${limite} para a granularidade ${this.rotuloGranularidade(filtro.granularidade)}.`;
    }

    return null;
  }

  private montarGraficos(evolucao: PainelVendasV2Evolucao[]): void {
    const faturamento = evolucao.map((item) => ({
      name: this.formatarPeriodo(item.periodo),
      value: item.faturamento,
    }));
    this.graficoFaturamento = faturamento.length
      ? [
          { name: 'Período atual', series: faturamento },
          // Serie do ano anterior: pontos sem movimento ficam de FORA (null),
          // em vez de virarem zero - zero significaria "vendeu nada", e nao
          // "nao havia dado". A linha fica interrompida, que e o correto.
          {
            name: 'Ano anterior',
            series: (this.evolucao ?? [])
              .filter((item) => item.anoAnterior != null)
              .map((item) => ({
                name: this.formatarPeriodo(item.periodo),
                value: Number(item.anoAnterior),
              })),
          },
        ]
      : [];
    this.graficoFaturas = evolucao.map((item) => ({
      name: this.formatarPeriodo(item.periodo),
      value: item.qtdFaturas,
    }));
  }

  private formatarPeriodo(periodo: string): string {
    if (this.granularidade === 'MES') {
      const partes = /^(\d{4})-(\d{2})$/.exec(periodo);
      if (!partes) return periodo;
      const data = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, 1));
      return new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(data);
    }

    const data = this.dataIsoEmUtc(periodo);
    if (data == null) return periodo;
    const rotulo = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(data));
    return this.granularidade === 'SEMANA' ? `Semana de ${rotulo}` : rotulo;
  }

  private mensagemDeErro(erro: HttpErrorResponse): string {
    const detalhe = erro.error as Partial<PainelVendasV2Erro> | null;
    const mensagem = detalhe && typeof detalhe.mensagem === 'string'
      ? detalhe.mensagem
      : '';

    if (erro.status === 400) {
      return mensagem || 'Os filtros informados são inválidos.';
    }
    if (erro.status === 422) {
      const explicacao = mensagem || 'O resultado contém dados demais para ser exibido.';
      return `${explicacao} Restrinja o período e tente novamente.`;
    }
    if (erro.status === 502) {
      return mensagem || 'Não foi possível consultar os dados de vendas.';
    }
    return mensagem || 'Não foi possível carregar o Painel de Vendas. Tente novamente.';
  }

  private limparResultado(): void {
    this.kpis = null;
    this.evolucao = [];
    this.graficoFaturamento = [];
    this.graficoFaturas = [];
  }

  private dataIsoEmUtc(valor: string): number | null {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (!partes) return null;
    const ano = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);
    const timestamp = Date.UTC(ano, mes - 1, dia);
    const data = new Date(timestamp);
    return data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes - 1 &&
      data.getUTCDate() === dia
      ? timestamp
      : null;
  }

  private rotuloGranularidade(granularidade: GranularidadePainelVendas): string {
    return granularidade === 'DIA' ? 'Dia' : granularidade === 'SEMANA' ? 'Semana' : 'Mês';
  }

  private paraDataIso(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private somarDias(data: Date, quantidade: number): Date {
    const resultado = new Date(data);
    resultado.setDate(resultado.getDate() + quantidade);
    return resultado;
  }
}
