/**
 * Documentação dos KPIs, exibida em tooltip.
 *
 * Espelha a semântica implementada em
 * `sap-rovema/.../PainelVendasV2Service.kt` e nos SQL do painel — se a regra
 * mudar lá, este arquivo precisa acompanhar. As ressalvas NÃO são detalhe:
 * várias delas nasceram de erros de cálculo encontrados em revisão.
 */
export interface KpiDoc {
  titulo: string;
  formula: string;
  detalhe: string;
  /** Limitação que o usuário precisa saber para não tirar conclusão errada. */
  ressalva?: string;
}

export const KPI_DOCS: Record<string, KpiDoc> = {
  faturamentoBruto: {
    titulo: 'Faturamento bruto',
    formula: 'Soma do total das notas − devoluções',
    detalhe:
      'Valor COM impostos, exatamente como consta no documento. Inclui notas de serviço.',
    ressalva:
      'Não existe versão "sem impostos" no painel: no Brasil PIS/COFINS e ICMS são por dentro e IPI/ST por fora, e nesta base o ICMS desonerado ainda majora o valor da linha. Um número "líquido" seria inventado.',
  },
  devolucoes: {
    titulo: 'Devoluções',
    formula: 'Soma das notas de crédito no período',
    detalhe: 'Exibido como valor positivo; já está descontado do faturamento.',
    ressalva:
      'Nem toda nota de crédito é devolução de mercadoria — pode ser abatimento financeiro. A taxa de devolução propriamente dita ainda não é publicada por isso.',
  },
  qtdFaturas: {
    titulo: 'Notas',
    formula: 'Contagem de faturas',
    detalhe:
      'Um cancelamento conta −1, para que valor e quantidade fiquem coerentes.',
    ressalva:
      'São faturas do ERP, não necessariamente notas fiscais autorizadas.',
  },
  ticketMedio: {
    titulo: 'Ticket médio',
    formula: 'Faturamento ÷ número de notas',
    detalhe: 'Quanto vale uma venda, em média. É por NOTA, não por produto.',
    ressalva:
      'Vazio quando não há notas no período — inclusive quando venda e cancelamento se anulam dentro do mesmo recorte.',
  },
  ticketMedioPorCliente: {
    titulo: 'Ticket médio por cliente',
    formula: 'Faturamento ÷ clientes ativos',
    detalhe:
      'Quanto cada cliente comprou em média. Cresce quando o mesmo cliente compra mais vezes ou compra mais por vez.',
  },
  precoMedio: {
    titulo: 'Preço médio',
    formula: 'Valor das linhas de produto ÷ quantidade vendida',
    detalhe:
      'Usa a quantidade em unidade de ESTOQUE e cobre apenas linhas de produto — documentos de serviço ficam de fora, então a base difere do faturamento.',
    ressalva:
      'Soma quantidades de produtos com unidades diferentes (kg, unidade, caixa). Serve como TENDÊNCIA no total; só é um preço real dentro de um mesmo produto ou grupo homogêneo.',
  },
  clientesAtivos: {
    titulo: 'Clientes ativos',
    formula: 'Clientes distintos que compraram no período',
    detalhe:
      'Conta apenas quem teve fatura. Quem só recebeu devolução não entra.',
  },
  filiaisComVenda: {
    titulo: 'Filiais com venda',
    formula: 'Filiais distintas com ao menos uma venda líquida',
    detalhe:
      'Filial cuja única nota foi cancelada no período não é contada.',
  },
};
