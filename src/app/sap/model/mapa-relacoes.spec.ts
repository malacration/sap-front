import { mesclarNivel, MapaRelacoesResponse, montarCartao, toCytoscapeElements } from './mapa-relacoes';

describe('mapa-relacoes (rastreio de lote)', () => {

  const rastreio : MapaRelacoesResponse = {
    root: 'LOTE:PAC1:S1',
    nodes: [
      { id: 'ORDEM_PRODUCAO:10', tipo: 'ORDEM_PRODUCAO', docEntry: 10, docNum: '29606', cardCode: null,
        label: 'Ordem de Produção 29606', valor: null, data: '2026-10-28T00:00', status: 'Fechada',
        detalhes: ['PAC1 - OX TURBO', 'Gerou: S1 (1631)'] },
      { id: 'LOTE:PAC1:S1', tipo: 'LOTE', docEntry: null, docNum: 'S1', cardCode: null,
        label: 'Lote S1', valor: null, data: null, status: null, detalhes: ['PAC1 - OX TURBO'] },
    ],
    edges: [{ id: 'lote-0', from: 'ORDEM_PRODUCAO:10', to: 'LOTE:PAC1:S1', tipo: 'LOTE', rotulo: 'S1' }],
  }

  it('card da OP traz o produto e o lote gerado abaixo do numero', () => {
    const linhas = montarCartao(rastreio.nodes[0]).split('\n')

    expect(linhas.slice(0, 5)).toEqual(['Ordem de Produção', 'Fechada', '29606', 'PAC1 - OX TURBO', 'Gerou: S1 (1631)'])
  })

  it('card do lote mostra o numero e o item', () => {
    expect(montarCartao(rastreio.nodes[1]).split('\n')).toEqual(['Lote', 'S1', 'PAC1 - OX TURBO'])
  })

  it('aresta leva o numero do lote para o grafo', () => {
    const aresta = toCytoscapeElements(rastreio).find(el => el.data.source)

    expect(aresta.data.rotulo).toBe('S1')
    expect(aresta.data.target).toBe('LOTE:PAC1:S1')
  })

  it('clique num lote junta o nivel seguinte ao mapa, sem duplicar e sem reabrir lote ja aberto', () => {
    const atual : MapaRelacoesResponse = {
      root: 'LOTE:PAC1:S1', aviso: null,
      nodes: [
        { ...rastreio.nodes[1] },
        { ...rastreio.nodes[0] },
        { id: 'LOTE:PDC1:PR2', tipo: 'LOTE', docEntry: null, docNum: 'PR2', cardCode: null, label: 'Lote PR2',
          valor: null, data: null, status: null, situacao: 'ORIGEM_DISPONIVEL', item: 'PDC1' },
      ],
      edges: [...rastreio.edges, { id: 'pr2>10', from: 'LOTE:PDC1:PR2', to: 'ORDEM_PRODUCAO:10', tipo: 'LOTE', rotulo: 'PR2' }],
    }
    const nivel : MapaRelacoesResponse = {
      root: 'LOTE:PDC1:PR2',
      nodes: [
        { ...atual.nodes[2], situacao: null },
        { id: 'ORDEM_PRODUCAO:20', tipo: 'ORDEM_PRODUCAO', docEntry: 20, docNum: '29569', cardCode: null,
          label: 'Ordem de Produção 29569', valor: null, data: null, status: 'Fechada' },
        { id: 'LOTE:INS1:PR1', tipo: 'LOTE', docEntry: null, docNum: 'PR1', cardCode: null, label: 'Lote PR1',
          valor: null, data: null, status: null, situacao: 'ORIGEM_DISPONIVEL', item: 'INS1' },
      ],
      edges: [
        { id: '20>pr2', from: 'ORDEM_PRODUCAO:20', to: 'LOTE:PDC1:PR2', tipo: 'LOTE', rotulo: 'PR2' },
        { id: 'pr1>20', from: 'LOTE:INS1:PR1', to: 'ORDEM_PRODUCAO:20', tipo: 'LOTE', rotulo: 'PR1' },
      ],
    }

    const mapa = mesclarNivel(atual, nivel, 'LOTE:PDC1:PR2')

    expect(mapa.root).toBe('LOTE:PAC1:S1')
    expect(mapa.nodes.map(n => n.id)).toEqual(['LOTE:PAC1:S1', 'ORDEM_PRODUCAO:10', 'LOTE:PDC1:PR2', 'ORDEM_PRODUCAO:20', 'LOTE:INS1:PR1'])
    expect(mapa.nodes.find(n => n.id === 'LOTE:PDC1:PR2').situacao).toBeNull()
    expect(mapa.edges.length).toBe(4)
  })

  it('abrir o destino so apaga o pedido de destino do lote clicado; a origem continua disponivel', () => {
    const lote = { id: 'LOTE:PAC1:S1', tipo: 'LOTE' as const, docEntry: null, docNum: 'S1', cardCode: null, label: 'Lote S1',
      valor: null, data: null, status: null, situacao: 'ORIGEM_DISPONIVEL', destino: true, item: 'PAC1' }
    const atual : MapaRelacoesResponse = { root: lote.id, nodes: [lote], edges: [] }
    const nivel : MapaRelacoesResponse = {
      root: lote.id,
      nodes: [{ ...lote, situacao: null }, { id: 'NOTA_FISCAL:13:500', tipo: 'NOTA_FISCAL', docEntry: 500, docNum: '9500',
        cardCode: 'CLI1', label: 'Nota Fiscal 9500', valor: null, data: null, status: null }],
      edges: [{ id: 'S1>NF', from: lote.id, to: 'NOTA_FISCAL:13:500', tipo: 'LOTE', rotulo: 'S1' }],
    }

    const mapa = mesclarNivel(atual, nivel, lote.id, 'destino')
    const clicado = mapa.nodes.find(n => n.id === lote.id)

    expect(clicado.destino).toBeFalse()
    expect(clicado.situacao).toBe('ORIGEM_DISPONIVEL')
    expect(mapa.nodes.length).toBe(2)
  })
})
