import { Observable, Subject, of } from 'rxjs';
import { CobrancaStatementComponent } from './cobranca-statement.component';
import { CobrancaTitulo } from '../../../sap/model/cobranca/cobranca-titulo';
import { CobrancaTitulosTotal } from '../../../sap/model/cobranca/cobranca-titulos-total';

describe('CobrancaStatementComponent', () => {

  // Sem TestBed de propósito: o que interessa aqui é cálculo puro, e o construtor só precisa de
  // getUser/getDefinition/queryParams. Mesmo estilo do cobranca.service.spec.ts.
  function componente(totaisFake?: CobrancaTitulosTotal): CobrancaStatementComponent {
    const auth = { getUser: () => 'Fulano' } as any;
    const service = {
      getDefinition: () => [],
      totais: () => of(totaisFake ?? new CobrancaTitulosTotal()),
    } as any;
    const route = { queryParams: of({}) } as any;
    return new CobrancaStatementComponent(auth, service, route);
  }

  /** Componente com ngOnInit rodado e a resposta de totais sob controle do teste. */
  function componenteComTotaisPendentes(resposta: Observable<CobrancaTitulosTotal>): CobrancaStatementComponent {
    const auth = { getUser: () => 'Fulano' } as any;
    const service = {
      getDefinition: () => [],
      listar: () => of({ titulos: [], truncadoRecebimento: false }),
      dominios: () => of([]),
      cobradores: () => of([]),
      totais: () => resposta,
    } as any;
    const route = { queryParams: of({}) } as any;
    const tela = new CobrancaStatementComponent(auth, service, route);
    tela.ngOnInit();
    return tela;
  }

  /**
   * Componente com a lista JÁ CARREGADA de verdade (ngOnInit -> filtrar -> listar), não com
   * `titulos` atribuído direto - é o único jeito de popular o snapshot que usaJanelaDePagamento
   * lê. `filtroDataPagamentoDe` é setado ANTES do ngOnInit pra ir junto na primeira carga.
   */
  function componenteComTitulosCarregados(
    titulosFake: CobrancaTitulo[],
    filtroDataPagamentoDe = '',
    truncadoRecebimento = false,
  ): CobrancaStatementComponent {
    const auth = { getUser: () => 'Fulano' } as any;
    const service = {
      getDefinition: () => [],
      listar: () => of({ titulos: titulosFake, truncadoRecebimento }),
      dominios: () => of([]),
      cobradores: () => of([]),
      totais: () => of(new CobrancaTitulosTotal()),
    } as any;
    const route = { queryParams: of({}) } as any;
    const tela = new CobrancaStatementComponent(auth, service, route);
    tela.filtroDataPagamentoDe = filtroDataPagamentoDe;
    tela.ngOnInit();
    return tela;
  }

  function titulo(dados: Partial<CobrancaTitulo>): CobrancaTitulo {
    return CobrancaTitulo.from(dados);
  }

  describe('totais das linhas carregadas', () => {
    it('soma saldo e valor pago, ignorando parcela sem pagamento', () => {
      const tela = componente();
      tela.titulos = [
        titulo({ Saldo: 100.5, ValorPago: 40 }),
        titulo({ Saldo: 200.25, ValorPago: 60.5 }),
        titulo({ Saldo: 50, ValorPago: null }),
      ];

      expect(tela.saldoCarregado).toBe(350.75);
      expect(tela.pagoCarregado).toBe(100.5);
      expect(tela.parcelasComPagamentoCarregadas).toBe(2);
    });

    it('com filtro de data de pagamento ligado, soma ValorRecebidoNoPeriodo em vez de ValorPago', () => {
      // ValorPago e so o ultimo recebimento; com uma parcela paga duas vezes no periodo, o
      // numero certo (o que bate com o card "Recuperado") e ValorRecebidoNoPeriodo.
      const tela = componenteComTitulosCarregados([
        titulo({ Saldo: 0, ValorPago: 50, ValorRecebidoNoPeriodo: 90 }),
        titulo({ Saldo: 0, ValorPago: 30, ValorRecebidoNoPeriodo: 30 }),
        titulo({ Saldo: 0, ValorPago: null, ValorRecebidoNoPeriodo: null }),
      ], '2026-09-01');

      expect(tela.pagoCarregado).toBe(120);
      expect(tela.parcelasComPagamentoCarregadas).toBe(2);
    });

    it('sem filtro de data de pagamento, continua somando ValorPago (o ultimo recebimento)', () => {
      const tela = componenteComTitulosCarregados([
        titulo({ Saldo: 0, ValorPago: 50, ValorRecebidoNoPeriodo: 999 }),
      ]);

      expect(tela.pagoCarregado).toBe(50);
    });

    it('editar a data sem clicar em Filtrar nao muda a soma das linhas ja carregadas (bug reportado)', () => {
      // Reproduzido: campo de data ao vivo, sem snapshot, fazia o rodape trocar de coluna (e de
      // valor) so por causa da edicao do formulario - antes de qualquer nova busca acontecer.
      const tela = componenteComTitulosCarregados([
        titulo({ Saldo: 0, ValorPago: 50, ValorRecebidoNoPeriodo: 90 }),
      ], '2026-09-01');
      expect(tela.pagoCarregado).toBe(90);

      tela.filtroDataPagamentoDe = '';

      expect(tela.usaJanelaDePagamento).toBeTrue();
      expect(tela.pagoCarregado).toBe(90);
    });

    it('preencher a data numa lista carregada sem periodo tambem nao muda a soma antes de filtrar', () => {
      const tela = componenteComTitulosCarregados([
        titulo({ Saldo: 0, ValorPago: 50, ValorRecebidoNoPeriodo: 90 }),
      ]);
      expect(tela.pagoCarregado).toBe(50);

      tela.filtroDataPagamentoDe = '2026-09-01';

      expect(tela.usaJanelaDePagamento).toBeFalse();
      expect(tela.pagoCarregado).toBe(50);
    });

    it('soma em centavos inteiros, sem deriva de float', () => {
      // 0.1 + 0.2 + 0.3 em float dá 0.6000000000000001 - num total de conferência isso vira
      // divergência de centavo na tela.
      const tela = componente();
      tela.titulos = [
        titulo({ Saldo: 0.1, ValorPago: null }),
        titulo({ Saldo: 0.2, ValorPago: null }),
        titulo({ Saldo: 0.3, ValorPago: null }),
      ];

      expect(tela.saldoCarregado).toBe(0.6);
    });

    it('lista vazia soma zero em vez de quebrar', () => {
      const tela = componente();
      tela.titulos = [];

      expect(tela.saldoCarregado).toBe(0);
      expect(tela.pagoCarregado).toBe(0);
    });
  });

  describe('total do filtro inteiro', () => {
    it('guarda o total que o backend devolveu', () => {
      const total = CobrancaTitulosTotal.from({ Parcelas: 7, Saldo: 999.9, ValorPago: 10, ParcelasComPagamento: 1 });
      const tela = componenteComTotaisPendentes(of(total));

      tela.calcularTotalDoFiltro();

      expect(tela.totalDoFiltro?.Parcelas).toBe(7);
      expect(tela.calculandoTotal).toBeFalse();
    });

    it('descarta a resposta que chegou depois de o filtro mudar', () => {
      // Bug reportado: pedir a soma da filial A, trocar pra B antes da resposta, e o total de A
      // pousar sobre a lista de B. Zerar totalDoFiltro ao recarregar a lista não resolve - a
      // resposta atrasada chega depois e preenche de novo.
      const resposta = new Subject<CobrancaTitulosTotal>();
      const tela = componenteComTotaisPendentes(resposta);

      tela.calcularTotalDoFiltro();
      tela.filtroCobrador = 'Outro cobrador';
      resposta.next(CobrancaTitulosTotal.from({ Parcelas: 9, Saldo: 100 }));

      expect(tela.totalDoFiltro).toBeNull();
      expect(tela.calculandoTotal).toBeFalse();
    });

    it('aceita a resposta quando o filtro continua o mesmo', () => {
      const resposta = new Subject<CobrancaTitulosTotal>();
      const tela = componenteComTotaisPendentes(resposta);

      tela.calcularTotalDoFiltro();
      resposta.next(CobrancaTitulosTotal.from({ Parcelas: 9, Saldo: 100 }));

      expect(tela.totalDoFiltro?.Parcelas).toBe(9);
    });

    it('descarta o total quando o filtro muda', () => {
      // Total calculado pro filtro anterior sobrevivendo à troca é um número errado com cara de
      // oficial - o pior defeito possível numa tela de conferência.
      const tela = componenteComTotaisPendentes(of(CobrancaTitulosTotal.from({ Parcelas: 3 })));
      tela.calcularTotalDoFiltro();
      expect(tela.totalDoFiltro).not.toBeNull();

      tela.limparFiltros();

      expect(tela.totalDoFiltro).toBeNull();
    });
  });

  describe('carregar mais / truncamento do recebimento no periodo', () => {
    it('carregar mais usa o filtro que carregou a pagina 1, nao o formulario ao vivo (bug reportado)', () => {
      // Reproduzido: carregar 20 parcelas com periodo, apagar a data e clicar em "Carregar
      // mais" mudava a soma das linhas JA carregadas - mesmo a pagina 2 vindo vazia - porque o
      // criterio (usaJanelaDePagamento) era recalculado com o filtro atual do formulario.
      const chamadas: any[] = [];
      const auth = { getUser: () => 'Fulano' } as any;
      const paginaCheia = {
        titulos: Array.from({ length: 20 }, () => titulo({ Saldo: 0, ValorPago: 10, ValorRecebidoNoPeriodo: 10 })),
        truncadoRecebimento: false,
      };
      const service = {
        getDefinition: () => [],
        listar: (filtro: any) => {
          chamadas.push(filtro);
          return chamadas.length === 1 ? of(paginaCheia) : of({ titulos: [], truncadoRecebimento: false });
        },
        dominios: () => of([]),
        cobradores: () => of([]),
        totais: () => of(new CobrancaTitulosTotal()),
      } as any;
      const route = { queryParams: of({}) } as any;
      const tela = new CobrancaStatementComponent(auth, service, route);
      tela.filtroDataPagamentoDe = '2026-09-01';
      tela.ngOnInit();

      expect(tela.usaJanelaDePagamento).toBeTrue();
      expect(tela.pagoCarregado).toBe(200);

      // Mexeu no campo mas NAO clicou em "Filtrar".
      tela.filtroDataPagamentoDe = '';
      tela.carregarMais();

      expect(chamadas[1].dataPagamentoDe).toBe('2026-09-01');
      expect(tela.usaJanelaDePagamento).toBeTrue();
      expect(tela.pagoCarregado).toBe(200);
    });

    it('recebimentoTruncado fica true quando a pagina volta com TruncadoRecebimento (bug reportado)', () => {
      // Bug reportado: listar() descartava o aviso de truncamento que totalizar() ja
      // propagava - uma parcela com recebimento real virava ValorRecebidoNoPeriodo=null em
      // silencio, sem a tela saber que a busca ficou incompleta.
      const tela = componenteComTitulosCarregados(
        [titulo({ Saldo: 0, ValorPago: 50, ValorRecebidoNoPeriodo: null })],
        '2026-09-01',
        true,
      );

      expect(tela.recebimentoTruncado).toBeTrue();
    });

    it('sem truncamento, recebimentoTruncado fica false', () => {
      const tela = componenteComTitulosCarregados(
        [titulo({ Saldo: 0, ValorPago: 50, ValorRecebidoNoPeriodo: 50 })],
        '2026-09-01',
      );

      expect(tela.recebimentoTruncado).toBeFalse();
    });
  });

  describe('recorte herdado do Resultado', () => {
    it('comAcompanhamento volta a null no Limpar, pra não sobrar filtro invisível ligado', () => {
      const tela = componente();
      tela.filtroComAcompanhamento = true;

      tela.limparFiltros();

      expect(tela.filtroComAcompanhamento).toBeNull();
    });

    it('sem nada herdado, o numero do card nao aparece', () => {
      const tela = componente();

      expect(tela.recorteIntacto).toBeFalse();
    });
  });
});
