import { OrdemProducao } from '../_model/ordem-producao';
import { OrdemProducaoPdfService } from './ordem-producao-pdf.service';

function ordem(numero : number, linhas = 3) : OrdemProducao {
  return OrdemProducao.from({
    AbsoluteEntry: numero,
    DocumentNumber: 1000 + numero,
    ItemNo: 'PAC*80',
    ProductDescription: 'OX TURBO',
    ProductionOrderStatus: 'boposReleased',
    PlannedQuantity: 3600,
    StartDate: '2026-10-27T00:00:00Z',
    Warehouse: '01',
    U_LbrOne_Batelada: 2,
    U_lote_producao: 'TUR007545',
    U_sysfeed_numero: '34600',
    Produto: { ValidadeDias: 180, Formula: 117 },
    ProductionOrderLines: [
      ...Array.from({ length: linhas }, (_, i) => ({ ItemNo: `INS*${i}`, ItemName: `INSUMO ${i}`, ItemType: 'pit_Item', PlannedQuantity: 1000 + i })),
      { ItemNo: 'MAQ1', ItemName: 'MISTURADOR', ItemType: 'pit_Resource', PlannedQuantity: 2 },
    ],
  })
}

// Texto que o jsPDF escreveu, para conferir o que saiu preenchido.
function texto(doc : any) : string {
  return doc.output().replace(/\\\(/g, '(').replace(/\\\)/g, ')')
}

describe('OrdemProducaoPdfService', () => {
  const service = new OrdemProducaoPdfService()

  it('ordem de producao: uma pagina por ordem, com OP, codigo e materias-primas sem o recurso', () => {
    const doc = service.ordemProducao([ordem(1), ordem(2)])
    const conteudo = texto(doc)

    expect(doc.getNumberOfPages()).toBe(2)
    expect(conteudo).toContain('ORDEM DE PRODU')
    expect(conteudo).toContain('1001')
    expect(conteudo).toContain('PAC*80')
    expect(conteudo).toContain('INSUMO 2')
    expect(conteudo).not.toContain('MISTURADOR')
    // codigo junto do nome, lote do campo de usuario, validade calculada, formula e numero do SysFeed
    expect(conteudo).toContain('PAC*80 - OX TURBO')
    expect(conteudo).toContain('TUR007545')
    expect(conteudo).toContain('25/04/2027')
    expect(conteudo).toContain('(117)')
    expect(conteudo).toContain('34600')
    // 2 bateladas de 3600 kg: 1800 kg por batida; INSUMO 0 = 1000 kg / 2 = 500 por batida
    expect(conteudo).toContain('1.800')
    expect(conteudo).toContain('(500)')
  })

  it('ordem de producao com muitas materias-primas continua numa folha so', () => {
    [1, 12, 25, 40].forEach(quantidade => {
      const doc = service.ordemProducao([ordem(1, quantidade)])

      expect(doc.getNumberOfPages()).withContext(`${quantidade} materias-primas`).toBe(1)
      expect(texto(doc)).toContain(`INSUMO ${quantidade - 1}`)
    })
  })

  it('ordem curta sai em A4; lista longa sai numa pagina so na proporcao do A4', () => {
    const curta = service.ordemProducao([ordem(1, 5)])
    const longa = service.ordemProducao([ordem(1, 40)])
    const proporcao = (doc : any) => doc.internal.pageSize.getHeight() / doc.internal.pageSize.getWidth()

    expect(curta.internal.pageSize.getWidth()).toBeCloseTo(210, 0)
    expect(curta.internal.pageSize.getHeight()).toBeCloseTo(297, 0)
    expect(longa.getNumberOfPages()).toBe(1)
    expect(proporcao(longa)).toBeCloseTo(297 / 210, 3)
  })

  it('ordem com muitas bateladas (contador maior) continua numa folha so', () => {
    const muitas = ordem(1, 25)
    muitas.U_LbrOne_Batelada = 100

    expect(service.ordemProducao([muitas]).getNumberOfPages()).toBe(1)
  })

  it('ordem de embalagem de uma ordem ocupa uma folha', () => {
    expect(service.ordemEmbalagem([ordem(1)]).getNumberOfPages()).toBe(1)
  })

  it('ordem de embalagem: varias ordens no mesmo PDF, quebrando pagina quando enche', () => {
    const doc = service.ordemEmbalagem(Array.from({ length: 9 }, (_, i) => ordem(i)))

    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
    expect(texto(doc)).toContain('1008')
  })

  it('ordem sem bateladas sai com as lacunas em branco, sem NaN', () => {
    const semBatelada = ordem(1)
    semBatelada.U_LbrOne_Batelada = null

    const conteudo = texto(service.ordemProducao([semBatelada]))

    expect(conteudo).not.toContain('NaN')
  })
})
