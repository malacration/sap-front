export interface DepositoNecessidade {
  whsCode: string;
  whsName: string;
  filial: number;
  filialNome: string | null;
  estoque: number;
}

/** Quantidades na unidade de estoque do item. */
export interface NecessidadeProducaoLinha {
  itemCode: string;
  itemName: string;
  grupo: string | null;
  /** U_linha_sustennutri (premium, mega...). A tela agrupa por ela. */
  linha: string | null;
  /** Descricao do valor valido (OX PREMIUM). */
  linhaNome: string | null;
  /** Posicao do valor valido no SAP: ordem dos grupos. */
  linhaOrdem: number | null;
  unidade: string | null;
  estoque: number;
  pedido: number;
  contratoVendaFutura: number;
  simplesFaturamento: number;
  /** estoque - pedido */
  aFabricar: number;
  /** contratoVendaFutura + simplesFaturamento */
  semPrevisao: number;
}

export interface NecessidadeProducao {
  linhas: NecessidadeProducaoLinha[];
  /** Depositos em que o estoque foi somado. */
  depositos: string[];
  /** Filiais em que a venda (pedido e sem previsao) foi somada. */
  filiais: number[];
  depositosExcluidos: string[];
  utilizacoesSimplesFaturamento: number[];
}

export interface NecessidadeProducaoFiltro {
  itemDe: string;
  itemAte: string;
  filiais: number[];
  depositos: string[];
}

/** Produtos de uma mesma linha (U_linha_sustennutri) com os subtotais. */
export interface GrupoLinhaProduto {
  chave: string;
  nome: string;
  linhas: NecessidadeProducaoLinha[];
  estoque: number;
  pedido: number;
  aFabricar: number;
  semPrevisao: number;
}

/** Celula clicada: a coluna Pedido ou a Sem previsao. */
export type DetalheNecessidade = 'PEDIDO' | 'SEM_PREVISAO';

export type TipoDocumentoNecessidade = 'PEDIDO' | 'VENDA_FUTURA' | 'SIMPLES_FATURAMENTO';

/** Um documento por tras da celula, na unidade de estoque. saldo e o que entra na celula. */
export interface DocumentoNecessidade {
  tipo: TipoDocumentoNecessidade;
  docEntry: number;
  docNum: number;
  data: string | null;
  previsao: string | null;
  cardCode: string | null;
  cardName: string | null;
  filial: number;
  filialNome: string | null;
  deposito: string | null;
  vendedor: string | null;
  contratoVendaFutura: number | null;
  quantidade: number;
  /** Na venda futura ja desconta a devolucao. */
  entregue: number;
  /** So no contrato: retirada que ja virou pedido. */
  emPedido: number;
  saldo: number;
}

export interface NecessidadeProducaoDetalhe {
  itemCode: string;
  detalhe: DetalheNecessidade;
  documentos: DocumentoNecessidade[];
  /** Filiais em que a venda foi somada. */
  filiais: number[];
  total: number;
}

/** O que identifica uma celula: produto, coluna e as filiais da venda no relatorio que a gerou. */
export interface NecessidadeProducaoDetalheFiltro {
  itemCode: string;
  detalhe: DetalheNecessidade;
  filiais: number[];
}
