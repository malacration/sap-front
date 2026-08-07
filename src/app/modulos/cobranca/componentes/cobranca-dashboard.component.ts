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

  carregandoResumo = false;
  carregandoEvolucao = false;
  erro = '';
  segundosCarregando = 0;

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
  private timerId: any = null;

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
    this.pararTimer();
  }

  formatTime(): string {
    const minutos = Math.floor(this.segundosCarregando / 60);
    const segundos = this.segundosCarregando % 60;
    return `${this.pad(minutos)}:${this.pad(segundos)}`;
  }

  buscar(): void {
    const filtro = this.getFiltro();

    this.carregandoResumo = true;
    this.iniciarTimer();
    this.erro = '';
    this.service.dashboard(filtro).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.carregandoResumo = false;
        this.pararTimer();
        this.desenharTudo();
      },
      error: () => {
        this.carregandoResumo = false;
        this.pararTimer();
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

  verCarteira(): void {
    this.irParaTitulos({ situacaoSap: 'ABERTO' });
  }

  verRecuperado(): void {
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

  verCobrador(cobrador: string | null | undefined): void {
    if (!cobrador || cobrador === 'Sem cobrador') {
      return;
    }
    this.irParaTitulos({ cobrador });
  }

  statusEhClicavel(status: string): boolean {
    return !!status && status !== 'Sem acompanhamento';
  }

  verStatus(status: string): void {
    if (!this.statusEhClicavel(status)) {
      return;
    }
    this.irParaTitulos({ situacaoSap: 'ABERTO', status });
  }

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

  private pad(num: number): string {
    return num < 10 ? `0${num}` : num.toString();
  }

  private iniciarTimer(): void {
    this.pararTimer();
    this.segundosCarregando = 0;
    this.timerId = setInterval(() => {
      this.segundosCarregando++;
    }, 1000);
  }

  private pararTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private somarDias(data: Date, dias: number): Date {
    const nova = new Date(data.getTime());
    nova.setDate(nova.getDate() + dias);
    return nova;
  }

  private desenharTudo(): void {
    if (!this.viewPronta) {
      return;
    }
    this.destruirGraficos();
    const tema = this.modoEscuro ? TEMA.escuro : TEMA.claro;

    this.desenharBarras(this.graficoAging, {
      rotulos: this.dashboard.Faixas.map((f) => f.Faixa),
      valores: this.dashboard.Faixas.map((f) => f.Saldo ?? 0),
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
    canvas.nativeElement.style.cursor = opcoes.aoClicar ? 'pointer' : 'default';

    const maiorValor = Math.max(0, ...opcoes.valores);
    const eixoValor = {
      gridLines: { color: opcoes.tema.grade, zeroLineColor: opcoes.tema.eixo, drawBorder: false },
      ticks: {
        beginAtZero: true,
        suggestedMax: maiorValor,
        fontColor: opcoes.tema.texto,
        callback: (valor: number) => this.abreviar(valor),
      },
    };
    const eixoCategoria = {
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
        maintainAspectRatio: false,
        legend: { display: false },
        layout: {
          padding: opcoes.horizontal ? { right: 40 } : { top: 20 },
        },
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

  private paraInput(data: Date): string {
    const mes = `${data.getMonth() + 1}`.padStart(2, '0');
    const dia = `${data.getDate()}`.padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
  }
}
