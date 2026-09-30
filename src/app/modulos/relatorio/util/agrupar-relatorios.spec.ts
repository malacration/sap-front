import {
  SEM_PASTA,
  agruparPorPasta,
  destacar,
  filtrarRelatorios,
  normalizarBusca,
} from './agrupar-relatorios';

describe('Busca e pastas de relatorios', () => {
  const r = (nome: string, pasta?: string | null, descricao?: string | null) => ({ nome, pasta, descricao });
  const nomes = (lista: { nome: string }[]) => lista.map((i) => i.nome);

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
      expect(nomes(filtrarRelatorios(lista, 'COBRANCA'))).toEqual(['Cobrança em aberto']);
    });

    it('casa pela descricao e pela pasta, nao so pelo nome', () => {
      expect(nomes(filtrarRelatorios(lista, 'vencidos'))).toEqual(['Cobrança em aberto']);
      expect(nomes(filtrarRelatorios(lista, 'financeiro'))).toEqual(['Cobrança em aberto', 'Contas a receber']);
    });

    it('todas as palavras precisam aparecer, em qualquer ordem', () => {
      expect(nomes(filtrarRelatorios(lista, 'cliente vendas'))).toEqual(['Vendas por cliente']);
      expect(filtrarRelatorios(lista, 'vendas estoque')).toEqual([]);
    });

    it('a palavra digitada tem que COMECAR uma palavra do texto, nao aparecer no meio', () => {
      const base = [r('Contas a Pagar'), r('Adiantamentos de clientes'), r('Comissões — venda normal')];
      expect(nomes(filtrarRelatorios(base, 'pag'))).toEqual(['Contas a Pagar']);
      expect(nomes(filtrarRelatorios(base, 'adiant'))).toEqual(['Adiantamentos de clientes']);
      expect(filtrarRelatorios(base, 'gar')).toEqual([]);
      expect(filtrarRelatorios(base, 'ar')).toEqual([]);
      expect(nomes(filtrarRelatorios(base, 'co'))).toEqual(['Comissões — venda normal', 'Contas a Pagar']);
    });

    it('nao devolve nada quando nada casa', () => {
      expect(filtrarRelatorios(lista, 'zzz')).toEqual([]);
    });

    describe('relevancia', () => {
      it('acerto no nome vem antes de pasta, e pasta antes de descricao', () => {
        const base = [
          r('Resumo mensal', null, 'mostra o que falta pagar'),
          r('Saldos', 'Pagar'),
          r('Contas a Pagar', 'Financeiro'),
        ];
        expect(nomes(filtrarRelatorios(base, 'pagar'))).toEqual(['Contas a Pagar', 'Saldos', 'Resumo mensal']);
      });

      it('nome que comeca pelo que foi digitado passa na frente dos demais acertos no nome', () => {
        const base = [r('Conciliação de contas'), r('Contas a receber')];
        expect(nomes(filtrarRelatorios(base, 'contas'))).toEqual(['Contas a receber', 'Conciliação de contas']);
      });

      it('empate de relevancia desempata por nome', () => {
        const base = [r('Zeta vendas'), r('Alfa vendas'), r('Mega vendas')];
        expect(nomes(filtrarRelatorios(base, 'vendas'))).toEqual(['Alfa vendas', 'Mega vendas', 'Zeta vendas']);
      });
    });

    describe('letras fora do plano basico', () => {
      it('a letra antes e lida inteira: "a" depois de uma letra de par substituto nao comeca palavra', () => {
        expect(filtrarRelatorios([r('\u{10400}a')], 'a')).toEqual([]);
        expect(nomes(filtrarRelatorios([r('\u{10400} a')], 'a'))).toEqual(['\u{10400} a']);
        expect(destacar('\u{10400}a', 'a').some((t) => t.marcado)).toBeFalse();
      });
    });

    describe('"Sem pasta"', () => {
      it('dentro do grupo virtual, nome que comeca pela frase passa na frente', () => {
        const base = [r('A'), r('Sem pasta Z')];
        expect(nomes(filtrarRelatorios(base, 'sem pasta'))).toEqual(['Sem pasta Z', 'A']);
      });

      it('a frase (ou o comeco dela) acha so os relatorios sem pasta', () => {
        expect(nomes(filtrarRelatorios(lista, 'sem pasta'))).toEqual(['Estoque']);
        expect(nomes(filtrarRelatorios(lista, 'SEM PAS'))).toEqual(['Estoque']);
        expect(nomes(filtrarRelatorios(lista, 'sem p'))).toEqual(['Estoque']);
        expect(nomes(filtrarRelatorios([r('A', '   '), r('B', 'Vendas'), r('C')], 'sem pasta'))).toEqual(['A', 'C']);
      });

      it('"sem" ou "pasta" sozinhos NAO casam com todo relatorio sem pasta', () => {
        expect(filtrarRelatorios(lista, 'sem')).toEqual([]);
        expect(filtrarRelatorios(lista, 'pasta')).toEqual([]);
      });

      it('um relatorio cujo proprio nome tem "sem" continua achavel por ele', () => {
        expect(nomes(filtrarRelatorios([r('Sem faturamento'), r('Estoque')], 'sem'))).toEqual(['Sem faturamento']);
      });
    });
  });

  describe('agruparPorPasta', () => {
    it('agrupa por pasta ignorando caixa e espacos, com o titulo da primeira ocorrencia', () => {
      const grupos = agruparPorPasta(lista);
      const vendas = grupos.find((g) => g.chave === 'vendas')!;
      expect(vendas.titulo).toBe('Vendas');
      expect(nomes(vendas.itens)).toEqual(['Vendas por cliente', 'Vendas por vendedor']);
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
      expect(nomes(grupos[0].itens)).toEqual(['Álgebra', 'Relatório 2', 'Relatório 10']);
    });

    it('lista vazia nao gera grupos', () => {
      expect(agruparPorPasta([])).toEqual([]);
    });

    describe('por relevancia', () => {
      const porRelevancia = [r('Melhor', 'Zebra'), r('Medio', 'Alfa'), r('Sem dono'), r('Pior', 'Zebra')];

      it('mantem a ordem de chegada: o grupo do melhor acerto fica em cima', () => {
        const grupos = agruparPorPasta(porRelevancia, true);
        expect(grupos.map((g) => g.titulo)).toEqual(['Zebra', 'Alfa', SEM_PASTA]);
        expect(nomes(grupos[0].itens)).toEqual(['Melhor', 'Pior']);
      });

      it('"Sem pasta" vai para o fim mesmo quando o melhor acerto e dele', () => {
        const grupos = agruparPorPasta([r('Sem dono'), r('Outro', 'Alfa')], true);
        expect(grupos.map((g) => g.titulo)).toEqual(['Alfa', SEM_PASTA]);
      });
    });
  });

  describe('destacar', () => {
    const marcas = (texto: string, termo: string) =>
      destacar(texto, termo).filter((t) => t.marcado).map((t) => t.texto);

    it('sem termo, ou sem acerto, devolve o texto inteiro sem marca', () => {
      expect(destacar('Contas a Pagar', '')).toEqual([{ texto: 'Contas a Pagar', marcado: false }]);
      expect(destacar('Contas a Pagar', 'zzz')).toEqual([{ texto: 'Contas a Pagar', marcado: false }]);
      expect(destacar(null, 'a')).toEqual([{ texto: '', marcado: false }]);
    });

    it('marca so o comeco da palavra que casou, mantendo o texto original', () => {
      expect(destacar('Contas a Pagar', 'pag')).toEqual([
        { texto: 'Contas a ', marcado: false },
        { texto: 'Pag', marcado: true },
        { texto: 'ar', marcado: false },
      ]);
    });

    it('ignora acento e caixa, e devolve o trecho com o acento original', () => {
      expect(marcas('Cobrança em aberto', 'COBR')).toEqual(['Cobr']);
      expect(marcas('Cobrança em aberto', 'cobranca')).toEqual(['Cobrança']);
      expect(marcas('Comissões', 'comissoes')).toEqual(['Comissões']);
    });

    it('nao marca no meio de uma palavra', () => {
      expect(marcas('Contas a Pagar', 'gar')).toEqual([]);
    });

    it('marca cada palavra digitada e junta trechos colados', () => {
      expect(marcas('Vendas por cliente', 'vendas cli')).toEqual(['Vendas', 'cli']);
      expect(marcas('Contas a Pagar', 'contas pagar')).toEqual(['Contas', 'Pagar']);
    });

    it('os trechos, juntos, reconstituem exatamente o texto original', () => {
      const original = 'Notas intercompany — conciliação saída × entrada';
      expect(destacar(original, 'nota conc sai').map((t) => t.texto).join('')).toBe(original);
    });

    it('texto ja decomposto (letra + acento soltos) fica com a marca inteira, sem partir no acento', () => {
      const decomposto = 'A\u0301rvore';
      expect(destacar(decomposto, 'arv')).toEqual([
        { texto: 'A\u0301rv', marcado: true },
        { texto: 'ore', marcado: false },
      ]);
      expect(destacar('Árvore', 'arv')).toEqual([
        { texto: 'Árv', marcado: true },
        { texto: 'ore', marcado: false },
      ]);
    });

    it('destaque e busca concordam: onde a busca acha, o destaque marca, e vice-versa', () => {
      const amostras: [string, string][] = [
        ['Árvore', 'arv'], ['A\u0301rvore', 'arv'], ['Cobrança', 'cobranca'], ['ΟΣ', 'ος'], ['ΟΣ', 'οσ'],
        ['Σίσυφος', 'σισ'], ['\u{1F600} Vendas', 'vend'], ['Contas a Pagar', 'gar'], ['İstanbul', 'is'],
        ['Straße', 'stra'], ['ﬁnanças', 'fin'], ['Ação e reação', 'acao reacao'],
      ];
      const devemAchar = ['arv', 'cobranca', 'οσ', 'ος', 'σισ', 'vend', 'is', 'stra', 'acao reacao'];
      for (const [texto, termo] of amostras) {
        const achou = filtrarRelatorios([{ nome: texto }], termo).length > 0;
        if (devemAchar.includes(termo)) {
          expect(achou).withContext(`deveria achar: ${texto} / ${termo}`).toBeTrue();
        }
        const marcou = destacar(texto, termo).some((t) => t.marcado);
        expect(marcou).withContext(`${texto} / ${termo}`).toBe(achou);
        expect(destacar(texto, termo).map((t) => t.texto).join('')).toBe(texto);
      }
    });

    it('o sigma final e o comum sao a mesma letra, na busca e no destaque', () => {
      expect(filtrarRelatorios([r('ΟΣ')], 'ος').length).toBe(1);
      expect(filtrarRelatorios([r('ΟΣ')], 'οσ').length).toBe(1);
      expect(filtrarRelatorios([r('Σίσυφος')], 'σισυφοσ').length).toBe(1);
      expect(marcas('ΟΣ', 'ος')).toEqual(['ΟΣ']);
    });

    it('nao quebra com emoji (caracteres fora do plano basico)', () => {
      const original = '😀 Vendas';
      expect(destacar(original, 'vend').map((t) => t.texto).join('')).toBe(original);
      expect(marcas(original, 'vend')).toEqual(['Vend']);
    });
  });
});
