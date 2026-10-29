import { OrdemProducao, somaDiasBr } from './ordem-producao';

describe('OrdemProducao', () => {

  it('validade = data de fabricacao + dias do cadastro, virando mes e ano', () => {
    expect(somaDiasBr('2026-10-27T00:00:00Z', 90)).toBe('25/01/2027')
    expect(somaDiasBr('2026-10-27', 365)).toBe('27/10/2027')
    expect(somaDiasBr('2026-10-27', null)).toBe('')
  })

  it('ordem de embalagem (PAC): sacos previstos, peso do saco, sacaria e tamanho', () => {
    const ordem = OrdemProducao.from({
      ItemNo: 'PAC0000167', ProductDescription: 'OX AVANCE 40KG', PlannedQuantity: 360, StartDate: '2026-10-27',
      Produto: { ValidadeDias: 90, PesoSaco: 40 },
      ProductionOrderLines: [
        { ItemNo: 'PDC0000066', ItemName: 'OX AVANCE', PlannedQuantity: 14400 },
        { ItemNo: 'EMB0000009', ItemName: 'SACARIA POWER 60x90', PlannedQuantity: 360 },
      ],
    })

    expect(ordem.produtoComCodigo).toBe('PAC0000167 - OX AVANCE 40KG')
    expect(ordem.ensacado).toBeTrue()
    expect(ordem.sacosPrevistos).toBe(360)
    expect(ordem.pesoSaco).toBe(40)
    expect(ordem.sacaria.ItemName).toBe('SACARIA POWER 60x90')
    expect(ordem.tamanhoSacaria).toBe('60x90')
    expect(ordem.validade).toBe('25/01/2027')
  })

  it('ordem de producao a granel (PDC) nao inventa sacos nem peso do saco', () => {
    const ordem = OrdemProducao.from({ ItemNo: 'PDC0000002', PlannedQuantity: 3013.5, Produto: { PesoSaco: 1 } })

    expect(ordem.ensacado).toBeFalse()
    expect(ordem.sacosPrevistos).toBeNull()
    expect(ordem.pesoSaco).toBeNull()
    expect(ordem.tamanhoSacaria).toBe('')
  })
})
