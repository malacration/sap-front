import { MapaEdge } from '../../../model/mapa-relacoes';
import { montarArvore } from './mapa-relacoes-grafo.component';

describe('montarArvore (rastreio de lote)', () => {

  const aresta = (from : string, to : string) : MapaEdge => ({ id: `${from}>${to}`, from, to, tipo: 'LOTE', rotulo: from })
  //cards de lote baixos, card de OP alto
  const tamanho = (id : string) => id.startsWith('OP') ? { w: 230, h: 190 } : { w: 200, h: 100 }

  //S1 <- OP10 <- (PR2, C1)
  const nivel1 = ['S1', 'OP10', 'PR2', 'C1']
  const arestas1 = [aresta('OP10', 'S1'), aresta('PR2', 'OP10'), aresta('C1', 'OP10')]

  function sobrepoem(pos : Map<string, {x:number,y:number}>, a : string, b : string) : boolean {
    const pa = pos.get(a), pb = pos.get(b), ta = tamanho(a), tb = tamanho(b)
    return Math.abs(pa.x - pb.x) < (ta.w + tb.w) / 2 && Math.abs(pa.y - pb.y) < (ta.h + tb.h) / 2
  }

  it('cada origem uma camada para tras (esquerda) do que ela gerou', () => {
    const pos = montarArvore('S1', nivel1, arestas1, tamanho)

    expect(pos.get('OP10').x).toBeLessThan(pos.get('S1').x)
    expect(pos.get('PR2').x).toBeLessThan(pos.get('OP10').x)
    expect(pos.get('PR2').x).toBe(pos.get('C1').x)
  })

  it('abrir a origem de um lote poe tudo atras dele, sem sobrepor nenhum card', () => {
    const ids = [...nivel1, 'OP20', 'PR1', 'X1', 'X2']
    const edges = [...arestas1, aresta('OP20', 'PR2'), aresta('PR1', 'OP20'), aresta('X1', 'OP20'), aresta('X2', 'OP20')]

    const pos = montarArvore('S1', ids, edges, tamanho)

    expect(pos.get('OP20').x).toBeLessThan(pos.get('PR2').x)
    expect(pos.get('PR1').x).toBeLessThan(pos.get('OP20').x)
    for(let i = 0; i < ids.length; i++)
      for(let j = i + 1; j < ids.length; j++)
        expect(sobrepoem(pos, ids[i], ids[j])).withContext(`${ids[i]} x ${ids[j]}`).toBeFalse()
  })

  it('lote que chega por dois caminhos aparece uma vez so', () => {
    const ids = ['S1', 'OP10', 'A', 'B', 'OPA', 'OPB', 'COMUM']
    const edges = [aresta('OP10', 'S1'), aresta('A', 'OP10'), aresta('B', 'OP10'), aresta('OPA', 'A'), aresta('OPB', 'B'),
      aresta('COMUM', 'OPA'), aresta('COMUM', 'OPB')]

    const pos = montarArvore('S1', ids, edges, tamanho)

    expect(pos.size).toBe(ids.length)
    expect(pos.get('COMUM').x).toBeLessThan(pos.get('OPA').x)
  })

  it('destino cresce para a direita da raiz, origem para a esquerda, sem sobrepor', () => {
    //S1 <- OP10 <- PR2 (origem); S1 -> OP40 -> PR3 e S1 -> NF (destino)
    const ids = ['S1', 'OP10', 'PR2', 'OP40', 'PR3', 'NF']
    const edges = [aresta('OP10', 'S1'), aresta('PR2', 'OP10'), aresta('S1', 'OP40'), aresta('OP40', 'PR3'), aresta('S1', 'NF')]

    const pos = montarArvore('S1', ids, edges, tamanho)

    expect(pos.get('OP10').x).toBeLessThan(pos.get('S1').x)
    expect(pos.get('OP40').x).toBeGreaterThan(pos.get('S1').x)
    expect(pos.get('NF').x).toBe(pos.get('OP40').x)
    expect(pos.get('PR3').x).toBeGreaterThan(pos.get('OP40').x)
    for(let i = 0; i < ids.length; i++)
      for(let j = i + 1; j < ids.length; j++)
        expect(sobrepoem(pos, ids[i], ids[j])).withContext(`${ids[i]} x ${ids[j]}`).toBeFalse()
  })

  it('destino de um insumo (outra OP que o consumiu) fica na camada da OP que ja estava, sem sobrepor', () => {
    //PR2 e insumo de OP10 e tambem foi consumido por OPX, que gerou PX e foi vendido em NFX
    const ids = ['S1', 'OP10', 'PR2', 'OPX', 'PX', 'NFX']
    const edges = [aresta('OP10', 'S1'), aresta('PR2', 'OP10'), aresta('PR2', 'OPX'), aresta('OPX', 'PX'), aresta('PX', 'NFX')]

    const pos = montarArvore('S1', ids, edges, tamanho)

    expect(pos.get('OPX').x).toBe(pos.get('OP10').x)
    expect(pos.get('PX').x).toBeGreaterThan(pos.get('OPX').x)
    for(let i = 0; i < ids.length; i++)
      for(let j = i + 1; j < ids.length; j++)
        expect(sobrepoem(pos, ids[i], ids[j])).withContext(`${ids[i]} x ${ids[j]}`).toBeFalse()
  })
})
