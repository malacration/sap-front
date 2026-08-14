import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import * as cytoscapeLib from 'cytoscape';
import { etiquetaSituacao, getCliente, MapaEdge, MapaNode, MapaRelacoesResponse, TIPO_ROTA, toCytoscapeElements } from '../../../model/mapa-relacoes';

//interop CJS/ESM: dependendo do bundler, o modulo vem como {default: fn} ou como a propria funcao
const cytoscape : any = (cytoscapeLib as any).default || cytoscapeLib;

//cytoscape-node-html-label tem um .d.ts quebrado (declara "module"/"cytoscape" como
//globais, conflitando com @types/node e com os tipos do proprio cytoscape) - usa require()
//pra nao entrar na checagem de tipos desse arquivo
const nodeHtmlLabel : any = require('cytoscape-node-html-label');
nodeHtmlLabel(cytoscape);

const ESTILO_TRACEJADO: Array<string> = ['CONCILIACAO', 'APROPRIACAO']

//zoom fixo (1 = fonte no tamanho real definido no estilo, 16px) - ver layoutstop
const ZOOM_FIXO = 1

//cor da borda/header do card: o documento que o usuario efetivamente buscou (nao a raiz
//da arvore) se destaca das demais relacoes, sem precisar de legenda por tipo.
//O cliente nao entra nessa distincao.
const COR_SELECIONADO = '#0d6efd'
const COR_RELACAO = '#6c757d'

//grade manual: cada coluna comporta no maximo 10 nos (10 linhas); o que passar disso
//avanca pra proxima coluna a direita, dentro do mesmo "nivel" (ver montarGrade)
const MAX_LINHAS_POR_COLUNA = 10
const LARGURA_COLUNA = 280
const ALTURA_LINHA = 150

//ramo unico compartilhado por todos os nos de nivel 0 (ver calcularRamos)
const RAMO_RAIZ = '__raiz__'

//totais do ciclo do contrato exibidos no rodape (ver calcularTotais). contrato/aFaturar
//sao null quando o grafo nao tem um Contrato de Venda Futura
export interface TotaisMapa {
  contrato : number | null
  faturado : number
  baixado : number
  recebido : number
  aFaturar : number | null
  aConciliar : number
  pagoNaoConciliado : number
}

@Component({
  selector: 'app-mapa-relacoes-grafo',
  templateUrl: './mapa-relacoes-grafo.component.html',
})
export class MapaRelacoesGrafoComponent implements AfterViewInit, OnChanges {

  @Input() response : MapaRelacoesResponse = null
  //id (formato "TIPO:docEntry") do documento que o usuario buscou - destacado em azul
  @Input() buscadoId : string = null
  @Input() mostrarControleZoom = true

  @ViewChild('grafo', { static: true }) grafoRef : ElementRef

  private cy : cytoscapeLib.Core = null
  private viewReady = false

  //sensibilidade do zoom no scroll do mouse - ajustavel ao vivo pelo slider na tela
  zoomSensibilidade = 1

  //cliente fica fora do cytoscape, num painel fixo (ver template) - nunca some com pan/zoom
  cliente : MapaNode = null

  //totais exibidos no rodape (ver calcularTotais)
  totais : TotaisMapa = null

  constructor(private router : Router){
  }

  ngAfterViewInit(): void {
    this.viewReady = true
    this.render()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['response'] && this.viewReady)
      this.render()
  }

  changeZoomSensibilidade(){
    if(!this.cy)
      return
    //cytoscape nao tem um setter publico pra wheelSensitivity depois de criado -
    //mexe direto na opcao interna, que e lida a cada evento de scroll (nao fica em cache)
    (this.cy as any)._private.options.wheelSensitivity = this.zoomSensibilidade
  }

  private render(){
    this.cy?.destroy()
    this.cliente = null
    this.totais = null
    if(!this.response)
      return

    this.cliente = getCliente(this.response)
    this.totais = this.calcularTotais()
    //destaca o documento que o usuario efetivamente buscou; sem essa info (ex.: grafo
    //mock com docEntry -1), cai de volta na raiz da arvore
    const destacadoId = this.buscadoId || this.response.root

    const elementos = toCytoscapeElements(this.response)
    const nodeIds = elementos.filter(el => !el.data.source).map(el => el.data.id as string)
    const edgesGrafo = this.response.edges.filter(e => nodeIds.includes(e.from) && nodeIds.includes(e.to))
    const posicoes = montarGrade(nodeIds, edgesGrafo)

    //anota coluna/linha de cada no na propria data do elemento - usado pelo estilo do
    //edge abaixo pra decidir se a aresta precisa arquear (pula coluna) ou pode ficar reta
    elementos.forEach(el => {
      if(el.data.source) return
      const pos = posicoes.get(el.data.id)
      if(!pos) return
      el.data.coluna = Math.round(pos.x / LARGURA_COLUNA)
      el.data.linha = Math.round(pos.y / ALTURA_LINHA)
    })

    this.cy = cytoscape({
      container: this.grafoRef.nativeElement,
      elements: elementos,
      style: [
        {
          //o card de verdade (borda, header, texto) e desenhado via HTML (nodeHtmlLabel,
          //logo abaixo) - o proprio no do cytoscape fica invisivel, so serve de "caixa"
          //pro layout/roteamento de aresta calcular o espaco certo (por isso mantem o
          //mesmo texto/fonte pra medir o tamanho, so sem pintar nada)
          selector: 'node',
          style: {
            'shape': 'round-rectangle',
            'background-opacity': 0,
            'border-width': 0,
            'label': 'data(cartao)',
            'text-opacity': 0,
            'text-wrap': 'wrap',
            'font-size': 16,
            'line-height': 1.3,
            'padding': 14,
            'width': 'label',
            'height': 'label',
          } as any
        },
        {
          //cytoscape nao tem roteamento de aresta "consciente de obstaculo" - como ja
          //sabemos a coluna/linha de cada no na grade (ver acima), arestas que pulam
          //coluna arqueiam pra fora da faixa das linhas da coluna, evitando cruzar os
          //cards do meio na maioria dos casos; entre colunas adjacentes fica reto (nao
          //ha o que evitar ali). Nao e perfeito em grafos com muitos nos, mas resolve o comum.
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#adb5bd',
            'target-arrow-color': '#adb5bd',
            'target-arrow-shape': 'triangle',
            'curve-style': 'unbundled-bezier',
            'control-point-distances': (e: any) => {
              const c1 = e.source().data('coluna') ?? 0
              const c2 = e.target().data('coluna') ?? 0
              if (Math.abs(c2 - c1) <= 1)
                return 0
              //com bandas simetricas ao redor do centro (ver montarGrade/distribuirEmPiramide),
              //0 e o proprio centro - acima dele (negativo) arqueia pra cima, abaixo
              //(ou no centro) arqueia pra baixo
              const linhaMedia = ((e.source().data('linha') ?? 0) + (e.target().data('linha') ?? 0)) / 2
              return linhaMedia < 0 ? -100 : 100
            },
            'control-point-weights': 0.5,
            'line-style': (e: any) => ESTILO_TRACEJADO.includes(e.data('tipo')) ? 'dashed' : 'solid',
          } as any
        }
      ],
      //sem "layout" aqui de proposito - roda manualmente logo abaixo, com o listener de
      //layoutstop ja registrado ANTES do .run(). Passar layout aqui faria o cytoscape
      //rodar (e finalizar) o layout dentro do proprio construtor com animate:false, e o
      //listener so seria registrado depois - perdendo o evento e nunca aplicando o piso de zoom
      minZoom: 0.15,
      maxZoom: 3,
      wheelSensitivity: this.zoomSensibilidade,
    })

    const layout = this.cy.layout({
      //posicionamento manual (grade calculada em montarGrade) em vez de um layout
      //automatico do cytoscape - da controle exato de "no maximo 2 por coluna"
      name: 'preset',
      positions: (node: any) => posicoes.get(node.id()) || { x: 0, y: 0 },
      //fit:false de proposito - zoom fica fixo (ver layoutstop abaixo), a fonte sempre
      //renderiza no mesmo tamanho independente do grafo ser grande ou pequeno. Se nao
      //couber tudo na tela, o usuario arrasta (pan) pra ver o resto, em vez de encolher.
      fit: false,
      padding: 40,
      animate: false,
    } as any)

    layout.one('layoutstop', () => {
      this.cy.zoom(ZOOM_FIXO)
      this.cy.center()
    })
    layout.run()

    ;(this.cy as any).nodeHtmlLabel([
      {
        query: 'node',
        halign: 'center',
        valign: 'center',
        halignBox: 'center',
        valignBox: 'center',
        tpl: (data: any) => {
          const cor = data.id === destacadoId ? COR_SELECIONADO : COR_RELACAO
          const linhas : Array<string> = (data.cartao || '').split('\n')
          const titulo = linhas[0] || ''
          const resto = linhas.slice(1)
          const url = this.construirUrlAbrir(data)
          const botaoAbrir = url
            ? `<a href="${url}" target="_blank" rel="noopener" title="Abrir em nova aba"
                  style="color:#fff; margin-left:6px; text-decoration:none; flex-shrink:0; line-height:1;"
                  onmousedown="event.stopPropagation()" onclick="event.stopPropagation()">
                 <i class="fas fa-external-link-alt"></i>
               </a>`
            : ''
          //situacao (TransactionCode do lancamento contabil, saldo do adiantamento) vira
          //etiqueta colorida - deixa obvio o que esta pendente, baixado ou cancelado
          const situacao = etiquetaSituacao(data)
          const etiqueta = situacao
            ? `<div style="background:${situacao.fundo}; color:${situacao.texto}; font-weight:600; font-size:11px;
                           text-transform:uppercase; letter-spacing:.3px; padding:3px 10px; text-align:center;">
                 ${escapeHtml(situacao.label)}
               </div>`
            : ''
          return `
            <div style="border:2px solid ${cor}; border-radius:6px; background:#fff; min-width:140px; max-width:230px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.2); font-family:inherit;">
              <div style="background:${cor}; color:#fff; font-weight:600; font-size:13px; padding:5px 10px; display:flex; align-items:center; justify-content:center;">
                <span>${escapeHtml(titulo)}</span>${botaoAbrir}
              </div>
              ${etiqueta}
              <div style="padding:8px 10px; font-size:13px; color:#212529; text-align:right; line-height:1.4;">
                ${resto.map(l => l === '' ? '<div style="height:8px"></div>' : `<div>${escapeHtml(l)}</div>`).join('')}
              </div>
            </div>
          `
        }
      }
    ], { enablePointerEvents: true })
  }

  /**
   * Totais do rodape, seguindo o ciclo do contrato de venda futura. As notas fiscais
   * tem dois papeis opostos e por isso somam separado:
   * - valor positivo = faturamento da entrega de mercadoria;
   * - valor negativo = apropriacao do adiantamento, que baixa aquela entrega e fecha
   *   o ciclo (gerada pelo ConciliacaoVendaFuturaSchedule).
   * Somar os dois juntos daria zero num contrato ja finalizado, escondendo os numeros.
   *
   * Derivados:
   * - aFaturar = contrato - faturado (mercadoria ainda nao entregue; zera quando a
   *   entrega do contrato termina);
   * - aConciliar = faturado - baixado (entrega ja faturada e ainda sem apropriacao);
   * - pagoNaoConciliado = adiantamentos pagos - baixado (dinheiro ja pago pelo cliente
   *   que ainda nao foi apropriado a nenhuma entrega). Usa o DocTotal dos proprios
   *   adiantamentos (ja fechados/pagos - "bost_Close"), NAO a soma dos recebimentos:
   *   um recebimento pode vir com juros de atraso embutidos, o que infla o total sem
   *   refletir o valor que de fato pode ser apropriado (a apropriacao sempre saca pelo
   *   DocTotal do adiantamento, nunca pelo valor recebido). Um adiantamento com boleto
   *   ainda em aberto tambem fica de fora - nao e dinheiro recebido.
   */
  private calcularTotais() : TotaisMapa {
    const nodes = this.response?.nodes || []
    const somar = (lista : Array<MapaNode>) => lista.reduce((total, n) => total + (n.valor ?? 0), 0)
    const notas = nodes.filter(n => n.tipo === 'NOTA_FISCAL')

    //sem contrato no grafo (ex.: busca direta por uma nota) nao da pra saber o quanto
    //ainda falta faturar - a linha correspondente fica de fora
    const contrato = nodes.find(n => n.tipo === 'CONTRATO')?.valor ?? null
    const faturado = somar(notas.filter(n => (n.valor ?? 0) > 0))
    const baixado = Math.abs(somar(notas.filter(n => (n.valor ?? 0) < 0)))
    const recebido = somar(nodes.filter(n => n.tipo === 'RECEBIMENTO'))
    const adiantamentosPagos = somar(
      nodes.filter(n => n.tipo === 'ADIANTAMENTO' && n.status === 'bost_Close')
    )

    return {
      contrato,
      faturado,
      baixado,
      recebido,
      aFaturar: contrato == null ? null : contrato - faturado,
      aConciliar: faturado - baixado,
      pagoNaoConciliado: adiantamentosPagos - baixado,
    }
  }

  //monta a URL interna do documento (mesma logica do app-sap-link-button: Router.createUrlTree
  //+ serializeUrl) - nao da pra usar o componente de verdade aqui porque o card e HTML puro
  //injetado pelo nodeHtmlLabel, fora do compilador do Angular
  private construirUrlAbrir(n: any) : string | null {
    const rota = TIPO_ROTA[n.tipo]
    if(!rota || n.docEntry == null)
      return null
    const tree = this.router.createUrlTree([rota], { queryParams: { id: n.docEntry } })
    return this.router.serializeUrl(tree)
  }
}

/**
 * Calcula a posicao (x,y) de cada no numa grade em formato de piramide: primeiro
 * agrupa por "nivel" (distancia do(s) no(s) raiz, mesma nocao de rank que o dagre
 * usaria - ver calcularNiveis) pra definir a coluna (x). Pra linha (y), agrupa os
 * nos por "ramo" (o galho que sai direto da raiz por onde cada no foi alcancado
 * primeiro - ver calcularRamos), ordena os ramos do mais profundo pro mais raso e
 * empacota as bandas verticais SEM espaco sobrando entre elas - a altura de cada
 * banda e a largura real do ramo (maior qtde de nos que ele tem num unico nivel,
 * limitada a MAX_LINHAS_POR_COLUNA), nao um tamanho fixo (ver calcularYBasePorRamo).
 * O ramo mais profundo fica centralizado (Y=0, mesma altura da raiz), os demais
 * alternam acima/abaixo dele bem coladinhos, criando o efeito piramide/leque sem
 * distancia desperdicada quando os ramos vizinhos sao pequenos.
 */
function montarGrade(nodeIds: Array<string>, edges: Array<MapaEdge>) : Map<string, {x:number,y:number}> {
  const niveis = calcularNiveis(nodeIds, edges)
  const ramos = calcularRamos(nodeIds, edges, niveis)

  const porNivel = new Map<number, Array<string>>()
  nodeIds.forEach(id => {
    const nivel = niveis.get(id) ?? 0
    if(!porNivel.has(nivel))
      porNivel.set(nivel, [])
    porNivel.get(nivel)!.push(id)
  })

  //profundidade (decide a ordem na piramide) e largura (maior qtde de nos num
  //unico nivel - decide a altura real da banda) de cada ramo
  const profundidadePorRamo = new Map<string, number>()
  const larguraPorRamo = new Map<string, number>()
  nodeIds.forEach(id => {
    const ramo = ramos.get(id)!
    const nivel = niveis.get(id) ?? 0
    profundidadePorRamo.set(ramo, Math.max(profundidadePorRamo.get(ramo) ?? 0, nivel))
  })
  porNivel.forEach(idsDoNivel => {
    const contagemPorRamo = new Map<string, number>()
    idsDoNivel.forEach(id => {
      const ramo = ramos.get(id)!
      contagemPorRamo.set(ramo, (contagemPorRamo.get(ramo) ?? 0) + 1)
    })
    contagemPorRamo.forEach((qtd, ramo) => {
      larguraPorRamo.set(ramo, Math.max(larguraPorRamo.get(ramo) ?? 0, qtd))
    })
  })

  //ramos de nivel 0 (raizes) nao entram na piramide - a propria raiz e o centro
  const ramosRaiz = new Set(nodeIds.filter(id => (niveis.get(id) ?? 0) === 0).map(id => ramos.get(id)!))
  const ramosOrdenados = [...profundidadePorRamo.keys()]
    .filter(ramo => !ramosRaiz.has(ramo))
    .sort((a, b) => (profundidadePorRamo.get(b) ?? 0) - (profundidadePorRamo.get(a) ?? 0))
  const slotPorRamo = distribuirEmPiramide(ramosOrdenados)
  const yBasePorRamo = calcularYBasePorRamo(slotPorRamo, larguraPorRamo)

  const posicoes = new Map<string, {x:number,y:number}>()
  let colunaCursor = 0
  const niveisOrdenados = [...porNivel.keys()].sort((a,b) => a - b)
  for(const nivel of niveisOrdenados){
    //dentro do nivel, agrupa por ramo - cada ramo empacota seus proprios nos
    //independente dos outros, dentro da propria banda vertical
    const porRamo = new Map<string, Array<string>>()
    porNivel.get(nivel)!.forEach(id => {
      const ramo = ramos.get(id)!
      if(!porRamo.has(ramo))
        porRamo.set(ramo, [])
      porRamo.get(ramo)!.push(id)
    })

    let maxSubColunas = 1
    porRamo.forEach((idsDoRamo, ramo) => {
      const yBase = yBasePorRamo.get(ramo) ?? 0
      idsDoRamo.forEach((id, indice) => {
        const subColuna = Math.floor(indice / MAX_LINHAS_POR_COLUNA)
        const linha = indice % MAX_LINHAS_POR_COLUNA
        posicoes.set(id, {
          x: (colunaCursor + subColuna) * LARGURA_COLUNA,
          y: yBase + linha * ALTURA_LINHA,
        })
        maxSubColunas = Math.max(maxSubColunas, subColuna + 1)
      })
    })
    colunaCursor += maxSubColunas
  }
  return posicoes
}

//empacota as bandas verticais dos ramos de cima pra baixo, na ordem dos slots
//(negativo = acima do centro, positivo = abaixo), usando a altura REAL de cada
//ramo (sem sobra) - depois desloca tudo pra a banda do ramo central (slot 0, ou
//qualquer ramo sem slot atribuido, ex.: a propria raiz) comecar em y=0
function calcularYBasePorRamo(slotPorRamo: Map<string, number>, larguraPorRamo: Map<string, number>) : Map<string, number> {
  const alturaRamo = (ramo: string) => Math.min(MAX_LINHAS_POR_COLUNA, larguraPorRamo.get(ramo) ?? 1) * ALTURA_LINHA

  const ramosPorSlotAsc = [...slotPorRamo.entries()].sort((a, b) => a[1] - b[1]).map(([ramo]) => ramo)

  const yBase = new Map<string, number>()
  let cursor = 0
  let offsetCentro = 0
  ramosPorSlotAsc.forEach(ramo => {
    yBase.set(ramo, cursor)
    if((slotPorRamo.get(ramo) ?? 0) === 0)
      offsetCentro = cursor
    cursor += alturaRamo(ramo)
  })
  yBase.forEach((y, ramo) => yBase.set(ramo, y - offsetCentro))
  return yBase
}

//atribui a cada no o "ramo" a que ele pertence: o ancestral de nivel 1 (filho direto
//da raiz) por onde ele foi alcancado primeiro numa busca a partir da(s) raiz(es) -
//nos de nivel 0 compartilham o ramo raiz. Usado pra manter cada galho agrupado numa
//mesma banda vertical em todas as colunas que ele atravessa (ver montarGrade).
function calcularRamos(nodeIds: Array<string>, edges: Array<MapaEdge>, niveis: Map<string, number>) : Map<string, string> {
  const sucessores = new Map<string, Set<string>>()
  nodeIds.forEach(id => sucessores.set(id, new Set()))
  edges.forEach(e => {
    if(sucessores.has(e.from) && sucessores.has(e.to))
      sucessores.get(e.from)!.add(e.to)
  })

  const ramos = new Map<string, string>()
  const raizes = nodeIds.filter(id => (niveis.get(id) ?? 0) === 0)
  //todas as raizes num unico ramo (nao uma por raiz): o ramo raiz e o unico que fica
  //fora da piramide, com yBase fixo em 0 - se cada raiz fosse seu proprio ramo, um
  //grafo com mais de uma raiz (desconexo) empilharia todas elas na mesma posicao
  raizes.forEach(id => ramos.set(id, RAMO_RAIZ))

  const fila = [...raizes]
  const visitados = new Set(raizes)
  while(fila.length > 0){
    const atual = fila.shift()!
    const ramoAtual = ramos.get(atual)!
    sucessores.get(atual)!.forEach(sucessor => {
      if(visitados.has(sucessor)) return
      visitados.add(sucessor)
      //um sucessor de nivel 1 comeca seu proprio ramo; mais fundo que isso, herda
      //o ramo de quem o alcancou primeiro
      const ehNivel1 = (niveis.get(sucessor) ?? 0) === 1
      ramos.set(sucessor, ehNivel1 ? sucessor : ramoAtual)
      fila.push(sucessor)
    })
  }
  //no isolado/nao alcancado a partir de nenhuma raiz (nao deveria acontecer, mas
  //evita deixar sem posicao) - vira seu proprio ramo
  nodeIds.forEach(id => { if(!ramos.has(id)) ramos.set(id, id) })
  return ramos
}

//distribui os ramos (ja ordenados do mais profundo pro mais raso) em bandas
//inteiras simetricas ao redor de 0: o primeiro (mais profundo) fica no centro (0),
//os demais alternam acima (-1,-2,...) e abaixo (1,2,...), criando o efeito piramide
function distribuirEmPiramide(ramosOrdenados: Array<string>) : Map<string, number> {
  const bandas = new Map<string, number>()
  ramosOrdenados.forEach((ramo, indice) => {
    if(indice === 0){
      bandas.set(ramo, 0)
      return
    }
    const passo = Math.ceil(indice / 2)
    const sinal = indice % 2 === 1 ? -1 : 1
    bandas.set(ramo, sinal * passo)
  })
  return bandas
}

//nivel = maior distancia (em arestas) a partir de qualquer no sem antecessor - via ordenacao
//topologica (Kahn). Ciclos (ex.: Adiantamento e Nota Fiscal conciliados nos dois sentidos)
//nao travam o calculo: quando a fila esvazia com nos pendentes, destrava pelo pendente que
//ja tem antecessor posicionado (ver proximoNoDeCiclo) em vez de deixar cair no nivel 0 -
//cair no nivel 0 jogava o no (e toda a descendencia dele) em cima do no raiz.
function calcularNiveis(nodeIds: Array<string>, edges: Array<MapaEdge>) : Map<string, number> {
  const sucessores = new Map<string, Set<string>>()
  const antecessores = new Map<string, Set<string>>()
  nodeIds.forEach(id => { sucessores.set(id, new Set()); antecessores.set(id, new Set()) })
  edges.forEach(e => {
    //o mesmo par pode estar ligado por mais de uma aresta (ex.: Nota Fiscal e Lancamento
    //Contabil ligados por CONCILIACAO e por RECLASSIFICACAO ao mesmo tempo) - os Sets
    //garantem que o par conte UMA vez so no indegree. Contar por aresta inflava o
    //indegree, que nunca zerava, e o no ficava eternamente pendente.
    if(e.from !== e.to && sucessores.has(e.from) && sucessores.has(e.to)){
      sucessores.get(e.from)!.add(e.to)
      antecessores.get(e.to)!.add(e.from)
    }
  })

  const indegree = new Map<string, number>()
  const nivel = new Map<string, number>()
  nodeIds.forEach(id => {
    indegree.set(id, antecessores.get(id)!.size)
    nivel.set(id, 0)
  })

  const fila = nodeIds.filter(id => indegree.get(id) === 0)
  const processados = new Set(fila)

  let i = 0
  while(true){
    if(i >= fila.length){
      const destravado = proximoNoDeCiclo(nodeIds, processados, antecessores, nivel)
      if(destravado == null)
        break
      processados.add(destravado)
      fila.push(destravado)
    }
    const id = fila[i++]
    const nivelAtual = nivel.get(id)!
    sucessores.get(id)!.forEach(sucessor => {
      //nao mexe no nivel de quem ja foi posicionado - num ciclo isso empurraria o
      //antecessor pra depois do proprio sucessor (aresta apontando pra tras)
      if(!processados.has(sucessor))
        nivel.set(sucessor, Math.max(nivel.get(sucessor) ?? 0, nivelAtual + 1))
      indegree.set(sucessor, indegree.get(sucessor)! - 1)
      if(indegree.get(sucessor)! <= 0 && !processados.has(sucessor)){
        processados.add(sucessor)
        fila.push(sucessor)
      }
    })
  }
  return nivel
}

//destrava a ordenacao topologica travada por ciclo: prefere o no pendente que ja tem
//algum antecessor processado (assim ele ja tem um nivel tentativo coerente, herdado de
//quem o alcancou) e, entre esses, o de menor nivel - mantendo o grafo crescendo da
//esquerda pra direita. So se nenhum tiver ancora e que pega qualquer pendente.
function proximoNoDeCiclo(nodeIds: Array<string>, processados: Set<string>,
                          antecessores: Map<string, Set<string>>, nivel: Map<string, number>) : string | null {
  const pendentes = nodeIds.filter(id => !processados.has(id))
  if(pendentes.length === 0)
    return null
  const comAncora = pendentes.filter(id => [...antecessores.get(id)!].some(ant => processados.has(ant)))
  const candidatos = comAncora.length > 0 ? comAncora : pendentes
  return [...candidatos].sort((a, b) => (nivel.get(a) ?? 0) - (nivel.get(b) ?? 0))[0]
}

function escapeHtml(texto: string) : string {
  const div = document.createElement('div')
  div.textContent = texto
  return div.innerHTML
}
