export type GranularidadePainelVendas = 'DIA' | 'SEMANA' | 'MES';

export interface PainelVendasV2Filtro {
  dataInicio: string;
  dataFim: string;
  filiais?: number[];
  slpCode?: number;
  granularidade: GranularidadePainelVendas;
}

export interface PainelVendasV2Escopo {
  filiais: number[];
  /**
   * true quando nenhuma restricao de filial foi aplicada (usuario admin sem
   * filtro). Nesse caso `filiais` carrega apenas um placeholder e NAO deve ser
   * exibida - o backend precisa mandar uma lista nao vazia porque `IN ()` e
   * erro de sintaxe no HANA.
   */
  todasFiliais: boolean;
  todosVendedores: boolean;
  vendedor: number | null;
}

export interface PainelVendasV2Kpis {
  faturamentoBruto: number;
  devolucoes: number;
  faturamentoLiquido: number;
  qtdFaturas: number;
  qtdDevolucoes: number;
  clientesAtivos: number;
  filiaisComVenda: number;
  ticketMedio: number | null;
  ticketMedioPorCliente: number | null;
  precoMedio: number | null;
  /** false quando o recorte mistura unidades de medida - exibir aviso junto. */
  precoMedioConfiavel: boolean;
  valorProdutos: number;
  qtdItens: number;
  escopo: PainelVendasV2Escopo;
}

export interface PainelVendasV2Evolucao {
  periodo: string;
  faturamento: number;
  qtdFaturas: number;
  /** Mesmo periodo do ano anterior. null = nao houve movimento (≠ zero). */
  anoAnterior: number | null;
}

export interface PainelVendasV2Erro {
  erro: 'filtro_invalido' | 'resultado_truncado' | 'erro_odbc' | string;
  mensagem: string;
}
