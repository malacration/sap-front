import { of } from 'rxjs';
import { CobrancaDashboardComponent } from './cobranca-dashboard.component';
import { CobrancaMes } from '../../../sap/model/cobranca/cobranca-dashboard';

describe('CobrancaDashboardComponent', () => {

  let navegouPara: { rota: any[]; extras: any } | null;

  // Sem TestBed: só interessa o cálculo da janela do mês e o que vai na navegação.
  function componente(): CobrancaDashboardComponent {
    navegouPara = null;
    const service = {
      dashboard: () => of(null),
      evolucao: () => of([]),
      cobradores: () => of([]),
    } as any;
    const store = { select: () => of({}) } as any;
    const router = {
      navigate: (rota: any[], extras: any) => {
        navegouPara = { rota, extras };
        return Promise.resolve(true);
      },
    } as any;
    return new CobrancaDashboardComponent(service, store, router);
  }

  function mes(dados: Partial<CobrancaMes>): CobrancaMes {
    return Object.assign(new CobrancaMes(), dados);
  }

  describe('clique na barra do gráfico de evolução', () => {
    it('abre o drill-down com a janela do mês clicado', () => {
      const tela = componente();

      tela.verMesRecuperado(mes({ Mes: '2026-03', Recuperado: 1234.5 }));

      expect(navegouPara?.rota).toEqual(['/cobranca/titulos']);
      expect(navegouPara?.extras.queryParams.dataPagamentoDe).toBe('2026-03-01');
      expect(navegouPara?.extras.queryParams.dataPagamentoAte).toBe('2026-03-31');
    });

    it('fevereiro de ano bissexto termina em 29', () => {
      // Trava o truque do `new Date(ano, mes, 0)` (dia 0 do mês seguinte = último deste).
      const tela = componente();

      tela.verMesRecuperado(mes({ Mes: '2024-02' }));

      expect(navegouPara?.extras.queryParams.dataPagamentoAte).toBe('2024-02-29');
    });

    it('usa o mesmo recorte do card: rastreado e sem travar situação SAP', () => {
      const tela = componente();

      tela.verMesRecuperado(mes({ Mes: '2026-03', Recuperado: 99 }));

      expect(navegouPara?.extras.queryParams.comAcompanhamento).toBeTrue();
      expect(navegouPara?.extras.queryParams.situacaoSap).toBe('');
      expect(navegouPara?.extras.queryParams.cardRecuperado).toBe(99);
    });

    it('barra sem mês não navega', () => {
      const tela = componente();

      tela.verMesRecuperado(undefined);

      expect(navegouPara).toBeNull();
    });
  });
});
