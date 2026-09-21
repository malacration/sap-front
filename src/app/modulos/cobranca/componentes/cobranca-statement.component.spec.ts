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
      listar: () => of([]),
      dominios: () => of([]),
      cobradores: () => of([]),
      totais: () => resposta,
    } as any;
    const route = { queryParams: of({}) } as any;
    const tela = new CobrancaStatementComponent(auth, service, route);
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
