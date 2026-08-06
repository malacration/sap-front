import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { formatCurrency } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import Chart from 'admin-lte/plugins/chart.js/Chart.min.js';
import { AppState } from '../../../store/state';
import { UiState } from '../../../store/ui/state';
import { Branch } from '../../../sap/model/branch';
import { SalesPerson } from '../../../sap/model/sales-person/sales-person';
import {
  CobrancaDashboard,
  CobrancaMes,
} from '../../../sap/model/cobranca/cobranca-dashboard';
import { CobrancaDashboardFiltro, CobrancaService } from '../../../sap/service/cobranca/cobranca.service';

// Paleta validada com o validador de cor contra as superfícies reais do AdminLTE
// (card claro #ffffff, card escuro #343a40) — todos os checks passaram nos dois modos.
//
// Duas regras que valem aqui e não são estéticas:
//  - Faixa de atraso é escala ORDENADA, então usa rampa de um só tom, mais atraso = mais
//    escuro. Em modo escuro a rampa inverte de direção (o passo mais forte é o mais claro),
//    porque é o contraste contra a superfície que tem que crescer.
//  - Filial e cobrador são categorias NOMINAIS: todas as barras usam UMA cor. Pintar mais
//    escuro onde o valor é maior duplicaria o comprimento da barra em tom, gastando o
//    único canal livre em informação que a barra já mostra.
const TEMA = {
  claro: {
    serie: '#2a78d6',
    rampaAging: ['#86b6ef', '#5598e7', '#2a78d6', '#184f95'],
    grade: '#e1e0d9',
    eixo: '#c3c2b7',
    texto: '#52514e',
  },
  escuro: {
    serie: '#3987e5',
    rampaAging: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5'],
    grade: 'rgba(255,255,255,0.10)',
    eixo: 'rgba(255,255,255,0.20)',
    texto: '#c3c2b7',
  },
};

@Component({
  selector: 'app-cobranca-dashboard',
  templateUrl: './cobranca-dashboard.component.html',
  styleUrls: ['./cobranca-dashboard.component.scss']
})
export class CobrancaDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('graficoAging') graficoAging: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoFilial') graficoFilial: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoEvolucao') graficoEvolucao: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoCobrador') graficoCobrador: ElementRef<HTMLCanvasElement>;

  // Sem skeleton: no refetch a tela segura o render anterior com opacidade reduzida, pra
  // não pular layout nem piscar a cada troca de filtro.
  carregandoResumo = false;
  carregandoEvolucao = false;
  erro = '';

  dashboard = new CobrancaDashboard();
  evolucao: CobrancaMes[] = [];

  filialSelecionada: Branch | null = null;
  vendedorSelecionado: SalesPerson | null = null;
  filtroDe = '';
  filtroAte = '';
  readonly mesesEvolucao = 6;

  private modoEscuro = false;
  private inscricaoUi: Subscription | null = null;
  private graficos: any[] = [];
  private viewPronta = false;

  constructor(
    private service: CobrancaService,
    private store: Store<AppState>,
    private router: Router,
  ) {
    const hoje = new Date();
    this.filtroDe = this.paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    this.filtroAte = this.paraInput(hoje);
  }

  ngOnInit(): void {
    // O Chart.js 2.x cozinha as cores dentro da config, então trocar de tema não é
    // atualizar uma variável: os gráficos têm que ser destruídos e recriados.
    this.inscricaoUi = this.store.select('ui').subscribe((state: UiState) => {
      const escuroAgora = !!state.darkMode;
      if (escuroAgora === this.modoEscuro) {
        return;
      }
      this.modoEscuro = escuroAgora;
      this.desenharTudo();
    });

    this.buscar();
  }

  ngAfterViewInit(): void {
    this.viewPronta = true;
    this.desenharTudo();
  }

  ngOnDestroy(): void {
    this.inscricaoUi?.unsubscribe();
    this.destruirGraficos();
  }

  buscar(): void {
    const filtro = this.getFiltro();

    this.carregandoResumo = true;
    this.erro = '';
    this.service.dashboard(filtro).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.carregandoResumo = false;
        this.desenharTudo();
      },
      error: () => {
        this.carregandoResumo = false;
        this.erro = 'Não foi possível carregar os indicadores de cobrança.';
      },
    });

    this.carregandoEvolucao = true;
    this.service.evolucao(filtro, this.mesesEvolucao).subscribe({
      next: (meses) => {
        this.evolucao = meses;
        this.carregandoEvolucao = false;
        this.desenharTudo();
      },
      error: () => {
        this.carregandoEvolucao = false;
      },
    });
  }

  limpar(): void {
    const hoje = new Date();
    this.filialSelecionada = null;
    this.vendedorSelecionado = null;
    this.filtroDe = this.paraInput(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    this.filtroAte = this.paraInput(hoje);
    this.buscar();
  }

  onFilialChange(branch: Branch): void {
    this.filialSelecionada = branch ?? null;
    this.buscar();
  }

  onVendedorChange(vendedor: SalesPerson): void {
    this.vendedorSelecionado = vendedor ?? null;
    this.buscar();
  }

  // ---- drill-down: todo número leva à lista que o gerou ----

  verCarteira(): void {
    this.irParaTitulos({ situacaoSap: 'ABERTO' });
  }

  verRecuperado(): void {
    // A lista mostra parcela, não pagamento: o mais próximo de "recuperado" que ela sabe
    // filtrar é a parcela já quitada e que teve acompanhamento.
    this.irParaTitulos({ situacaoSap: 'PAGO' });
  }

  verSemAcao(): void {
    this.irParaTitulos({ situacaoSap: 'ABERTO', semAcompanhamento: true });
  }

  verPromessasVencidas(): void {
    this.irParaTitulos({ situacaoSap: 'ABERTO', promessaVencidaAte: this.paraInput(new Date()) });
  }

  verFilial(bplId: number | null | undefined): void {
    if (bplId == null) {
      return;
    }
    this.irParaTitulos({ situacaoSap: 'ABERTO', filial: bplId });
  }

  // "Sem cobrador" é rótulo montado no backend pra agrupar quem está nulo, não um nome real -
  // mandar ele como filtro devolveria lista vazia.
  verCobrador(cobrador: string | null | undefined): void {
    if (!cobrador || cobrador === 'Sem cobrador') {
      return;
    }
    this.irParaTitulos({ cobrador });
  }

  // "Sem acompanhamento" agrupa status nulo E status vazio de título que já tem registro, e a
  // tela não sabe filtrar exatamente esse conjunto - clicar levaria a uma lista que não confere
  // com o número. Melhor não navegar do que abrir uma lista errada.
  statusEhClicavel(status: string): boolean {
    return !!status && status !== 'Sem acompanhamento';
  }

  verStatus(status: string): void {
    if (!this.statusEhClicavel(status)) {
      return;
    }
    this.irParaTitulos({ situacaoSap: 'ABERTO', status });
  }

  // Faixa de atraso não precisa de parâmetro novo: atraso entre N e M é exatamente DueDate
  // entre hoje-M e hoje-N, e o intervalo de vencimento já é filtro da tela. As bordas vêm do
  // mesmo enum que gerou o número no backend (FaixaAtraso), por isso batem.
  verFaixa(indice: number): void {
    const faixa = this.dashboard.Faixas[indice];
    if (!faixa) {
      return;
    }
    const hoje = new Date();
    const extra: Record<string, string | number | boolean> = { situacaoSap: 'ABERTO' };
    extra.vencimentoAte = this.paraInput(this.somarDias(hoje, -faixa.DiasMin));
    if (faixa.DiasMax != null) {
      extra.vencimentoDe = this.paraInput(this.somarDias(hoje, -faixa.DiasMax));
    }
    this.irParaTitulos(extra);
  }

  // Filial e vendedor do filtro da tela vão junto em toda navegação, senão a lista mostraria
  // um recorte diferente do número que foi clicado.
  private getFiltro(): CobrancaDashboardFiltro {
    return {
      filial: this.filialSelecionada?.Bplid != null ? Number(this.filialSelecionada.Bplid) : null,
      vendedor: this.vendedorSelecionado?.SalesEmployeeCode != null
        ? Number(this.vendedorSelecionado.SalesEmployeeCode)
        : null,
      de: this.filtroDe || null,
      ate: this.filtroAte || null,
    };
  }

  private irParaTitulos(extra: Record<string, string | number | boolean>): void {
    const filtro = this.getFiltro();
    const queryParams: Record<string, string | number | boolean> = { origem: 'resultado', ...extra };
    if (filtro.filial != null) {
      queryParams.filial = filtro.filial;
    }
    if (filtro.vendedor != null) {
      queryParams.vendedor = filtro.vendedor;
    }
    this.router.navigate(['/cobranca/titulos'], { queryParams });
  }

  private somarDias(data: Date, dias: number): Date {
    const nova = new Date(data.getTime());
    nova.setDate(nova.getDate() + dias);
    return nova;
  }

  // ---- gráficos ----

  private desenharTudo(): void {
    if (!this.viewPronta) {
      return;
    }
    this.destruirGraficos();
    const tema = this.modoEscuro ? TEMA.escuro : TEMA.claro;

    this.desenharBarras(this.graficoAging, {
      rotulos: this.dashboard.Faixas.map((f) => f.Faixa),
      valores: this.dashboard.Faixas.map((f) => f.Saldo ?? 0),
      // Única exceção à cor única: a faixa É uma escala ordenada.
      cores: tema.rampaAging,
      horizontal: false,
      tema,
      aoClicar: (indice) => this.verFaixa(indice),
    });

    this.desenharBarras(this.graficoFilial, {
      rotulos: this.dashboard.PorFilial.map((f) => f.filialFormatada),
      valores: this.dashboard.PorFilial.map((f) => f.Saldo ?? 0),
      cores: tema.serie,
      horizontal: true,
      tema,
      aoClicar: (indice) => this.verFilial(this.dashboard.PorFilial[indice]?.BPLId),
    });

    // Evolução mensal não é clicável: a lista de Títulos filtra por vencimento, não por data
    // de pagamento, então não existe filtro que reproduza "recuperado em julho".
    this.desenharBarras(this.graficoEvolucao, {
      rotulos: this.evolucao.map((m) => m.Rotulo),
      valores: this.evolucao.map((m) => m.Recuperado ?? 0),
      cores: tema.serie,
      horizontal: false,
      tema,
    });

    this.desenharBarras(this.graficoCobrador, {
      rotulos: this.dashboard.PorCobrador.map((c) => c.Cobrador),
      valores: this.dashboard.PorCobrador.map((c) => c.Recuperado ?? 0),
      cores: tema.serie,
      horizontal: true,
      tema,
      aoClicar: (indice) => this.verCobrador(this.dashboard.PorCobrador[indice]?.Cobrador),
    });
  }

  private desenharBarras(
    canvas: ElementRef<HTMLCanvasElement> | undefined,
    opcoes: {
      rotulos: string[];
      valores: number[];
      cores: string | string[];
      horizontal: boolean;
      tema: typeof TEMA.claro;
      aoClicar?: (indice: number) => void;
    },
  ): void {
    if (!canvas?.nativeElement || opcoes.rotulos.length === 0) {
      return;
    }
    // Cursor no canvas inteiro: é o único jeito de o clique na barra ser descobrível, já que o
    // Chart.js 2.x não muda o cursor por conta própria.
    canvas.nativeElement.style.cursor = opcoes.aoClicar ? 'pointer' : 'default';

    const eixoValor = {
      gridLines: { color: opcoes.tema.grade, zeroLineColor: opcoes.tema.eixo, drawBorder: false },
      ticks: {
        beginAtZero: true,
        fontColor: opcoes.tema.texto,
        callback: (valor: number) => this.abreviar(valor),
      },
    };
    const eixoCategoria = {
      // Barra fina: nunca preencher a faixa inteira, o resto do espaço é ar.
      maxBarThickness: 24,
      gridLines: { display: false, drawBorder: false },
      ticks: { fontColor: opcoes.tema.texto },
    };

    const grafico = new Chart(canvas.nativeElement.getContext('2d'), {
      type: opcoes.horizontal ? 'horizontalBar' : 'bar',
      data: {
        labels: opcoes.rotulos,
        datasets: [{
          data: opcoes.valores,
          backgroundColor: opcoes.cores,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        // Falso porque o container tem altura fixa e precisa caber a faixa do eixo -
        // altura que corta o eixo gera scroll interno no card.
        maintainAspectRatio: false,
        // Uma série só: legenda com um único quadradinho só repetiria o título do card.
        legend: { display: false },
        // No Chart.js 2.x o clique vem como lista de elementos atingidos; _index é a posição da
        // barra, que indexa o mesmo array que alimentou o gráfico.
        onClick: (_evento: any, elementos: any[]) => {
          // eslint-disable-next-line no-underscore-dangle -- _index é a API pública do Chart.js 2.x
          const indice = elementos?.[0]?._index;
          if (opcoes.aoClicar && indice != null) {
            opcoes.aoClicar(indice);
          }
        },
        tooltips: {
          callbacks: {
            label: (item: any) => this.moeda(opcoes.valores[item.index] ?? 0),
          },
        },
        scales: opcoes.horizontal
          ? { xAxes: [eixoValor], yAxes: [eixoCategoria] }
          : { xAxes: [eixoCategoria], yAxes: [eixoValor] },
      },
      // A 2.9.4 não traz plugin de rótulo direto; este afterDatasetsDraw escreve o valor
      // na ponta da barra. O rótulo é seletivo por natureza (uma série, poucas barras) e
      // o número exato também está na tabela ao pé da tela, então nada fica preso no
      // tooltip. Texto em token de texto, nunca na cor da série.
      plugins: [{
        afterDatasetsDraw: (chart: any) => {
          const ctx = chart.ctx;
          ctx.save();
          ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
          ctx.fillStyle = opcoes.tema.texto;
          chart.data.datasets.forEach((_: any, indiceDataset: number) => {
            chart.getDatasetMeta(indiceDataset).data.forEach((barra: any, indice: number) => {
              const texto = this.abreviar(opcoes.valores[indice] ?? 0);
              const { x, y } = barra.tooltipPosition();
              if (opcoes.horizontal) {
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(texto, x + 6, y);
              } else {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(texto, x, y - 4);
              }
            });
          });
          ctx.restore();
        },
      }],
    });

    this.graficos.push(grafico);
  }

  private destruirGraficos(): void {
    this.graficos.forEach((grafico) => grafico?.destroy());
    this.graficos = [];
  }

  private abreviar(valor: number): string {
    const absoluto = Math.abs(valor);
    if (absoluto >= 1_000_000) {
      return `${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    }
    if (absoluto >= 1_000) {
      return `${(valor / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
    }
    return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  private moeda(valor: number): string {
    return formatCurrency(valor, 'pt', 'R$') ?? '';
  }

  // Monta yyyy-MM-dd na mão em vez de toISOString(): o toISOString converte pra UTC, e
  // uma data local de meia-noite volta como o dia anterior em qualquer fuso à frente de
  // Greenwich - filtro que erra um dia sem ninguém perceber.
  private paraInput(data: Date): string {
    const mes = `${data.getMonth() + 1}`.padStart(2, '0');
    const dia = `${data.getDate()}`.padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
  }
}
