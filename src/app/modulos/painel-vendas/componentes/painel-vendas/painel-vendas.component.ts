import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';

import { AuthService } from '../../../../shared/service/auth.service';
import { Column } from '../../../../shared/components/table/column.model';
import { SalesPerson } from '../../../../sap/model/sales-person/sales-person';
import { VendaDetalhe, VendaMensal, VendaProduto } from '../../../../sap/model/venda-mensal.model';
import { PainelVendasService } from '../../service/painel-vendas.service';

interface BarraMes {
  name: string;
  value: number;
  extra: { Ano: number; Mes: number };
}

type VisualizacaoDetalhe = 'faturamento' | 'produto';

@Component({
  selector: 'app-painel-vendas',
  templateUrl: './painel-vendas.component.html',
})
export class PainelVendasComponent implements OnInit {
  podeEscolherVendedor = false;
  vendedorSelecionado: SalesPerson | null = null;
  carregando = false;

  totaisMensais: VendaMensal[] = [];
  grafico: BarraMes[] = [];

  mesSelecionado: { Ano: number; Mes: number } | null = null;
  visualizacao: VisualizacaoDetalhe = 'faturamento';
  carregandoDetalhe = false;

  detalheColumns: Column[] = [
    new Column('Nota Fiscal', 'DocNum'),
    new Column('Cliente', 'cardNameRouterLink'),
    new Column('Data', 'DocDate'),
    new Column('Total', 'DocTotal'),
  ];
  detalheMes: VendaDetalhe[] = [];

  produtoColumns: Column[] = [
    new Column('Código', 'ItemCode'),
    new Column('Descrição', 'Description'),
    new Column('Quantidade', 'Quantidade'),
    new Column('Total', 'Total'),
  ];
  detalheProdutos: VendaProduto[] = [];

  constructor(
    private authService: AuthService,
    private painelVendasService: PainelVendasService
  ) {}

  ngOnInit(): void {
    this.podeEscolherVendedor =
      this.authService.hasRole('admin') || this.authService.hasRole('vendedor_admin');

    // Quem nao pode escolher vendedor ve direto os proprios dados - o backend
    // resolve pelo login (auth.getIdInt()) quando nenhum slpCode e informado.
    if (!this.podeEscolherVendedor) this.getTotaisMensais();
  }

  selectOriginSalesPerson(sp: SalesPerson | null): void {
    this.vendedorSelecionado = sp;
    this.mesSelecionado = null;
    this.detalheMes = [];
    this.detalheProdutos = [];
    if (sp) this.getTotaisMensais(sp.SalesEmployeeCode as number);
    else this.totaisMensais = this.grafico = [];
  }

  private getTotaisMensais(slpCode?: number): void {
    this.carregando = true;
    this.painelVendasService.getTotaisMensais(slpCode).subscribe({
      next: (dados) => {
        this.totaisMensais = dados;
        this.grafico = dados.map((v) => ({
          name: moment(`${v.Ano}-${v.Mes}`, 'YYYY-M').format('MMM/YY'),
          value: v.Total,
          extra: { Ano: v.Ano, Mes: v.Mes },
        }));
        this.carregando = false;
      },
      error: () => {
        this.totaisMensais = this.grafico = [];
        this.carregando = false;
      },
    });
  }

  onSelectMes(barra: BarraMes): void {
    this.mesSelecionado = barra.extra;
    this.carregarDetalhe();
  }

  trocarVisualizacao(tipo: VisualizacaoDetalhe): void {
    if (this.visualizacao === tipo) return;
    this.visualizacao = tipo;
    this.carregarDetalhe();
  }

  private carregarDetalhe(): void {
    if (!this.mesSelecionado) return;
    const { Ano, Mes } = this.mesSelecionado;
    const slpCode = this.podeEscolherVendedor
      ? (this.vendedorSelecionado?.SalesEmployeeCode as number)
      : undefined;

    this.carregandoDetalhe = true;
    this.detalheMes = [];
    this.detalheProdutos = [];

    if (this.visualizacao === 'faturamento') {
      this.painelVendasService.getDetalheMes(Ano, Mes, slpCode).subscribe({
        next: (detalhe) => {
          this.detalheMes = detalhe.map((d) => this.formatDetalhe(d));
          this.carregandoDetalhe = false;
        },
        error: () => {
          this.detalheMes = [];
          this.carregandoDetalhe = false;
        },
      });
    } else {
      this.painelVendasService.getDetalheMesPorProduto(Ano, Mes, slpCode).subscribe({
        next: (produtos) => {
          this.detalheProdutos = produtos;
          this.carregandoDetalhe = false;
        },
        error: () => {
          this.detalheProdutos = [];
          this.carregandoDetalhe = false;
        },
      });
    }
  }

  private formatDetalhe(d: VendaDetalhe): VendaDetalhe {
    const m = new VendaDetalhe();
    Object.assign(m, d);
    m.DocDate = this.formatDocDate(d.DocDate);
    return m;
  }

  private formatDocDate(ymd: string): string {
    return moment(ymd, 'YYYYMMDD').format('DD/MM/YYYY');
  }

  formatMoeda(valor: number): string {
    return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  action(event: any): void {}
}
