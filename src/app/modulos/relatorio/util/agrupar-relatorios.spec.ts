import { SEM_PASTA, agruparPorPasta, filtrarRelatorios, normalizarBusca } from './agrupar-relatorios';

describe('Busca e pastas de relatorios', () => {
  const r = (nome: string, pasta?: string | null, descricao?: string | null) => ({ nome, pasta, descricao });

  const lista = [
    r('Vendas por cliente', 'Vendas', 'Total faturado no período'),
    r('Cobrança em aberto', 'Financeiro', 'Títulos vencidos'),
    r('Estoque', null),
    r('Vendas por vendedor', ' Vendas '),
    r('Contas a receber', 'financeiro'),
  ];

  describe('normalizarBusca', () => {
    it('ignora acento, caixa e espacos nas pontas', () => {
      expect(normalizarBusca('  COBRANÇA ')).toBe('cobranca');
      expect(normalizarBusca(undefined)).toBe('');
    });
  });

  describe('filtrarRelatorios', () => {
    it('termo vazio devolve a lista inteira', () => {
      expect(filtrarRelatorios(lista, '')).toBe(lista);
      expect(filtrarRelatorios(lista, '   ')).toBe(lista);
    });

    it('acha sem acento e sem diferenciar caixa', () => {
      expect(filtrarRelatorios(lista, 'COBRANCA').map((i) => i.nome)).toEqual(['Cobrança em aberto']);
    });

    it('casa pela descricao e pela pasta, nao so pelo nome', () => {
      expect(filtrarRelatorios(lista, 'vencidos').map((i) => i.nome)).toEqual(['Cobrança em aberto']);
      expect(filtrarRelatorios(lista, 'financeiro').map((i) => i.nome))
        .toEqual(['Cobrança em aberto', 'Contas a receber']);
    });

    it('todas as palavras precisam aparecer, em qualquer ordem', () => {
      expect(filtrarRelatorios(lista, 'cliente vendas').map((i) => i.nome)).toEqual(['Vendas por cliente']);
      expect(filtrarRelatorios(lista, 'vendas estoque')).toEqual([]);
    });

    it('quem busca "sem pasta" acha os relatorios do grupo Sem pasta, e so eles', () => {
      expect(filtrarRelatorios(lista, 'sem pasta').map((i) => i.nome)).toEqual(['Estoque']);
      expect(filtrarRelatorios([r('A', '   '), r('B', 'Vendas'), r('C')], 'SEM PASTA').map((i) => i.nome))
        .toEqual(['A', 'C']);
    });

    it('nao devolve nada quando nada casa', () => {
      expect(filtrarRelatorios(lista, 'zzz')).toEqual([]);
    });
  });

  describe('agruparPorPasta', () => {
    it('agrupa por pasta ignorando caixa e espacos, com o titulo da primeira ocorrencia', () => {
      const grupos = agruparPorPasta(lista);
      const vendas = grupos.find((g) => g.chave === 'vendas')!;
      expect(vendas.titulo).toBe('Vendas');
      expect(vendas.itens.map((i) => i.nome)).toEqual(['Vendas por cliente', 'Vendas por vendedor']);
      const financeiro = grupos.find((g) => g.chave === 'financeiro')!;
      expect(financeiro.titulo).toBe('Financeiro');
      expect(financeiro.itens.length).toBe(2);
    });

    it('ordena as pastas por nome e deixa "Sem pasta" por ultimo', () => {
      expect(agruparPorPasta(lista).map((g) => g.titulo)).toEqual(['Financeiro', 'Vendas', SEM_PASTA]);
    });

    it('"Sem pasta" fica por ultimo mesmo que seu nome venha antes na ordem alfabetica', () => {
      const grupos = agruparPorPasta([r('A'), r('B', 'Zebra')]);
      expect(grupos.map((g) => g.titulo)).toEqual(['Zebra', SEM_PASTA]);
    });

    it('pasta em branco ou nula vai para "Sem pasta"', () => {
      const grupos = agruparPorPasta([r('A', '   '), r('B', null), r('C')]);
      expect(grupos.length).toBe(1);
      expect(grupos[0].titulo).toBe(SEM_PASTA);
      expect(grupos[0].chave).toBe('');
    });

    it('uma pasta chamada "Sem pasta" nao cria um segundo grupo homonimo', () => {
      const grupos = agruparPorPasta([r('A', 'Sem pasta'), r('B')]);
      expect(grupos.length).toBe(1);
      expect(grupos[0].itens.length).toBe(2);
    });

    it('ordena os itens de cada pasta por nome, com numeros em ordem natural', () => {
      const grupos = agruparPorPasta([r('Relatório 10', 'X'), r('Relatório 2', 'X'), r('Álgebra', 'X')]);
      expect(grupos[0].itens.map((i) => i.nome)).toEqual(['Álgebra', 'Relatório 2', 'Relatório 10']);
    });

    it('lista vazia nao gera grupos', () => {
      expect(agruparPorPasta([])).toEqual([]);
    });
  });
});
