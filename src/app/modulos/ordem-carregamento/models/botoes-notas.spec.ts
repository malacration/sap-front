import { botoesNotas, StatusNota } from './botoes-notas';

const nota = (s: Partial<StatusNota>): StatusNota => ({
  Status: 'Autorizado', EhBoleto: true, BoletosAtivos: 0, ParcelasSemBoleto: 1, ...s
});

describe('botoesNotas', () => {
  it('sem nota autorizada nao mostra nada', () => {
    expect(botoesNotas([nota({ Status: null }), nota({ Status: 'Rejeitado' })]))
      .toEqual({ danfes: false, gerarBoletos: false, baixarBoletos: false });
  });

  it('nota de boleto autorizada sem boleto: DANFE e gerar, ainda sem baixar', () => {
    expect(botoesNotas([nota({})])).toEqual({ danfes: true, gerarBoletos: true, baixarBoletos: false });
  });

  it('tudo gerado: some o gerar e aparece o baixar', () => {
    expect(botoesNotas([nota({ BoletosAtivos: 1, ParcelasSemBoleto: 0 })]))
      .toEqual({ danfes: true, gerarBoletos: false, baixarBoletos: true });
  });

  it('gerar so conta nota de boleto autorizada', () => {
    // PIX autorizado e boleto ainda nao autorizado: nada a gerar agora
    expect(botoesNotas([nota({ EhBoleto: false }), nota({ Status: null })]).gerarBoletos).toBeFalse();
  });

  it('uma gerada e outra faltando: mostra os dois', () => {
    const r = botoesNotas([nota({ BoletosAtivos: 2, ParcelasSemBoleto: 0 }), nota({})]);
    expect(r.gerarBoletos).toBeTrue();
    expect(r.baixarBoletos).toBeTrue();
  });

  it('numero vindo como texto do sap-odbc', () => {
    expect(botoesNotas([nota({ BoletosAtivos: '1' as any, ParcelasSemBoleto: '0' as any })]))
      .toEqual({ danfes: true, gerarBoletos: false, baixarBoletos: true });
  });
});
