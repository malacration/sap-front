import { Regiao } from './regiao';

describe('Regiao (faixa base = minimo para entrega)', () => {

  //100km, R$ 2,00 a cada 100km por unidade na base de 50; R$ 1,50 a partir de 100
  function regiao() : Regiao {
    return Object.assign(new Regiao(), {
      U_CustoTransporte: 0,
      AR_REGIAO_LINHASCollection: [{ U_Locais: '10', U_Distancia: 100 }],
      AR_REGIAO_FAIXACollection: [{ U_QtdeAte: 100, U_ValorKm: 1.5 }, { U_QtdeAte: 50, U_ValorKm: 2 }],
    })
  }

  it('a menor faixa e a base e define o minimo de entrega', () => {
    expect(regiao().quantidadeMinimaEntrega).toBe(50)
  })

  it('abaixo da base nao calcula frete', () => {
    expect(regiao().calcularFrete('10', 30)).toBeNull()
  })

  it('documento abaixo da base usa a faixa base quando o pedido inteiro alcanca o minimo', () => {
    expect(regiao().calcularFrete('10', 30, 60).total).toBeCloseTo(60, 2)
    expect(regiao().calcularFrete('10', 30, 40)).toBeNull()
    expect(regiao().calcularFrete('10', 100, 160).total).toBeCloseTo(150, 2)
  })
})
