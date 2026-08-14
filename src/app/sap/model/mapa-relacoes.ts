export type MapaTipoDocumento =
  'CLIENTE' | 'CONTRATO' | 'COTACAO' | 'PEDIDO' | 'NOTA_FISCAL' | 'ADIANTAMENTO' | 'DEVOLUCAO' | 'RECEBIMENTO' | 'LANCAMENTO_CONTABIL' | 'OUTRO'

export type TipoAresta =
  'ORIGEM' | 'PEDIDO_ORIGEM' | 'GERADO_PARA_CONTRATO' | 'COPIA_DOCUMENTO' | 'CONCILIACAO' | 'APROPRIACAO' | 'RECLASSIFICACAO'

export interface MapaNode {
  id: string
  tipo: MapaTipoDocumento
  docEntry: number | null
  docNum: string | null
  cardCode: string | null
  label: string
  valor: number | null
  data: string | null
  status: string | null
  //situacao destacada como etiqueta colorida (ver SITUACAO_BADGE) - separada de status
  //porque alguns tipos usam as duas (adiantamento tem DocumentStatus proprio E pode
  //estar pendente de utilizacao)
  situacao?: string | null
}

export interface MapaEdge {
  id: string
  from: string
  to: string
  tipo: TipoAresta
}

export interface MapaRelacoesResponse {
  root: string
  nodes: Array<MapaNode>
  edges: Array<MapaEdge>
}

//tipos aceitos pelo endpoint /mapa-relacoes/{tipo}/{docEntry} (mesmos labels usados na busca)
export const TIPOS_BUSCA: Array<{ value: string, label: string }> = [
  { value: 'cotacao', label: 'Cotação' },
  { value: 'pedido', label: 'Pedido de Venda' },
  { value: 'nota-fiscal', label: 'Nota Fiscal' },
  { value: 'adiantamento', label: 'Adiantamento' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'contrato', label: 'Contrato de Venda Futura' },
]

//value da busca (kebab-case, usado na URL) -> MapaTipoDocumento (usado no id do no, "TIPO:docEntry")
const TIPO_BUSCA_PARA_ENUM: { [value: string]: MapaTipoDocumento } = {
  'cotacao': 'COTACAO',
  'pedido': 'PEDIDO',
  'nota-fiscal': 'NOTA_FISCAL',
  'adiantamento': 'ADIANTAMENTO',
  'devolucao': 'DEVOLUCAO',
  'contrato': 'CONTRATO',
}

//monta o id (mesmo formato "TIPO:docEntry" usado em MapaNode.id) do documento que o
//usuario efetivamente buscou - usado pra destacar ele no grafo, em vez do documento raiz
export function idDocumentoBuscado(tipoBusca: string, docEntry: number) : string | null {
  const tipo = TIPO_BUSCA_PARA_ENUM[tipoBusca]
  return tipo ? `${tipo}:${docEntry}` : null
}

//nome exibido no header do card - so o tipo, sem numero (o numero vira uma linha propria
//no corpo, ver montarCartao). Espelha os labels de MapaTipoDocumento no back.
const TIPO_LABEL: { [tipo: string]: string } = {
  CLIENTE: 'Cliente',
  CONTRATO: 'Contrato de Venda Futura',
  COTACAO: 'Cotação',
  PEDIDO: 'Pedido de Venda',
  NOTA_FISCAL: 'Nota Fiscal',
  ADIANTAMENTO: 'Adiantamento',
  DEVOLUCAO: 'Devolução',
  RECEBIMENTO: 'Recebimento',
  LANCAMENTO_CONTABIL: 'Lançamento Contábil',
  OUTRO: 'Documento',
}

//tela interna (Angular) que abre cada tipo de documento, pro botao "abrir em nova aba" do
//card (mesmo padrao do app-sap-link-button: sapRouterLink + queryParams id=docEntry).
export const TIPO_ROTA: { [tipo: string]: string } = {
  CONTRATO: '/venda/venda-futura',
  COTACAO: '/venda/cotacao',
  PEDIDO: '/venda/pedidos-venda',
  NOTA_FISCAL: '/financeiro/notas-fiscais',
  ADIANTAMENTO: '/financeiro/adiantamentos',
  DEVOLUCAO: '/financeiro/devolucoes',
  RECEBIMENTO: '/financeiro/recebimentos',
}

//status crus que o back manda (SAP DocumentStatus.typeName ou Contrato.U_status) -> rotulo em PT-BR
const STATUS_LABEL: { [status: string]: string } = {
  bost_Open: 'Aberto',
  bost_Close: 'Fechado',
  bost_Paid: 'Pago',
  bost_Delivered: 'Entregue',
  tYES: 'Cancelado',
  tNO: 'Ativo',
  aberto: 'Aberto',
  entregue: 'Entregue',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

/**
 * Etiqueta colorida exibida no card (ver mapa-relacoes-grafo.component), pra deixar claro
 * de relance o que está pendente, o que já foi baixado e o que foi cancelado.
 *
 * Lançamento contábil - vem do TransactionCode do SAP:
 * - VFET: reclassificação da entrega criada e ainda NÃO apropriada - é justamente o que
 *   BaixaSpreadVendaFuturaService.buscarVfet procura pra conciliar (pendente);
 * - VFEC: a mesma reclassificação depois da apropriação do adiantamento (VfetLookup.
 *   JaConciliada) - ciclo daquela entrega fechado (baixado);
 * - VFDV: reclassificação de devolução, criada por EstornoReclassificacaoVendaFuturaService;
 * - CanC: cancelado (marcado manualmente dentro do SAP);
 * - AROU: ajuste de spread / baixa de adiantamento com devolução.
 *
 * Adiantamento - calculado no back (MapaRelacoesService.situacaoAdiantamento):
 * - PENDENTE_UTILIZACAO: ainda sobra saldo a apropriar (INV9.DrawnSum < total).
 */
export const SITUACAO_BADGE: { [code: string]: { label: string, fundo: string, texto: string } } = {
  VFET: { label: 'Pendente de Baixa',   fundo: '#ffc107', texto: '#212529' },
  VFEC: { label: 'Baixado',             fundo: '#198754', texto: '#ffffff' },
  VFDV: { label: 'Estorno (Devolução)', fundo: '#0dcaf0', texto: '#212529' },
  CanC: { label: 'Cancelado',           fundo: '#dc3545', texto: '#ffffff' },
  AROU: { label: 'Ajuste',              fundo: '#6c757d', texto: '#ffffff' },
  PENDENTE_UTILIZACAO: { label: 'Pendente de Utilização', fundo: '#198754', texto: '#ffffff' },
}

export function etiquetaSituacao(n: { situacao?: string | null }) {
  return n.situacao ? SITUACAO_BADGE[n.situacao] : null
}

function formatarData(iso: string) : string {
  const d = new Date(iso)
  if(isNaN(d.getTime()))
    return iso
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function formatarValor(valor: number) : string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

//monta o texto multi-linha exibido dentro do proprio no. Primeira linha = titulo do
//header (so o tipo, sem numero). Corpo: Status, ID (sempre o DocNum, nunca o DocEntry -
//e o numero que o usuario reconhece, o DocEntry e so a chave interna do SAP), [espaco],
//Data, Valor - a linha vazia ('') separa o bloco status/ID do bloco data/valor, o
//componente do grafo a renderiza como um espacador (nao como texto)
export function montarCartao(n: MapaNode) : string {
  const status = n.status ? (STATUS_LABEL[n.status] || n.status) : null
  const id = n.docNum ? n.docNum : null
  const data = n.data ? formatarData(n.data) : null
  const valor = n.valor != null ? formatarValor(n.valor) : null

  const linhas = [TIPO_LABEL[n.tipo] || n.tipo]
  if(status)
    linhas.push(status)
  if(id)
    linhas.push(id)
  if((status || id) && (data || valor))
    linhas.push('')
  if(data)
    linhas.push(data)
  if(valor)
    linhas.push(valor)
  return linhas.join('\n')
}

//o Cliente nao entra no grafo do cytoscape (fica fixo num painel a parte, ver
//mapa-relacoes-grafo.component - assim ele nunca some quando o usuario navega/da
//zoom no grafo). Aqui so montamos os documentos de verdade + as arestas entre eles.
export function toCytoscapeElements(r: MapaRelacoesResponse): Array<any> {
  const nodesDocumento = r.nodes.filter(n => n.tipo !== 'CLIENTE')
  const nodes = nodesDocumento.map(n => ({ data: { ...n, cartao: montarCartao(n) } }))
  const idsValidos = new Set(nodesDocumento.map(n => n.id))
  //cytoscape exige especificamente data.source/data.target pra ligar a aresta aos nos,
  //e quebra a renderizacao inteira se uma aresta apontar pra um id inexistente -
  //descarta defensivamente em vez de deixar o grafo inteiro nao aparecer (isso tambem
  //descarta de brinde a aresta ORIGEM que ligava o cliente ao documento raiz)
  const edges = r.edges
    .filter(e => {
      const valido = idsValidos.has(e.from) && idsValidos.has(e.to)
      if(!valido && e.tipo !== 'ORIGEM')
        console.warn('Mapa de Relações: aresta descartada (nó inexistente)', e)
      return valido
    })
    .map(e => ({ data: { ...e, source: e.from, target: e.to } }))
  return [...nodes, ...edges]
}

export function getCliente(r: MapaRelacoesResponse) : MapaNode | null {
  return r.nodes.find(n => n.tipo === 'CLIENTE') || null
}

//grafo fake pra testar a tela sem depender do SAP - qualquer busca com docEntry = -1
//(em qualquer tipo) cai aqui em vez de chamar o back. Cobre pelo menos um no de cada
//tipo e pelo menos uma aresta de cada TipoAresta.
export function mockMapaRelacoesResponse() : MapaRelacoesResponse {
  const nodes : Array<MapaNode> = [
    { id: 'CLIENTE:CLI0000MOCK', tipo: 'CLIENTE', docEntry: null, docNum: null, cardCode: 'CLI0000MOCK',
      label: 'Cliente Mock LTDA', valor: null, data: null, status: null },
    { id: 'CONTRATO:1', tipo: 'CONTRATO', docEntry: 1, docNum: '1', cardCode: 'CLI0000MOCK',
      label: 'Contrato 1', valor: 15000, data: '2026-01-10T00:00:00Z', status: 'aberto' },
    { id: 'COTACAO:1', tipo: 'COTACAO', docEntry: 1, docNum: '9001', cardCode: 'CLI0000MOCK',
      label: 'Cotação 9001', valor: 15000, data: '2026-01-05T00:00:00Z', status: 'bost_Close' },
    { id: 'PEDIDO:1', tipo: 'PEDIDO', docEntry: 1, docNum: '8001', cardCode: 'CLI0000MOCK',
      label: 'Pedido 8001', valor: 15000, data: '2026-01-11T00:00:00Z', status: 'bost_Close' },
    { id: 'NOTA_FISCAL:1', tipo: 'NOTA_FISCAL', docEntry: 1, docNum: '7001', cardCode: 'CLI0000MOCK',
      label: 'Nota Fiscal 7001', valor: 12000, data: '2026-01-20T00:00:00Z', status: 'bost_Open' },
    { id: 'ADIANTAMENTO:1', tipo: 'ADIANTAMENTO', docEntry: 1, docNum: '6001', cardCode: 'CLI0000MOCK',
      label: 'Adiantamento 6001', valor: 5000, data: '2026-01-08T00:00:00Z', status: 'bost_Close',
      situacao: 'PENDENTE_UTILIZACAO' },
    { id: 'RECEBIMENTO:1', tipo: 'RECEBIMENTO', docEntry: 1, docNum: '4001', cardCode: 'CLI0000MOCK',
      label: 'Recebimento 4001', valor: 12000, data: '2026-01-21T00:00:00Z', status: null },
    //devolucao nao liga direto no contrato - ela estorna uma nota fiscal de saida especifica,
    //entao esse caminho tem seu proprio pedido/nota, separado do caminho principal acima
    { id: 'PEDIDO:2', tipo: 'PEDIDO', docEntry: 2, docNum: '8002', cardCode: 'CLI0000MOCK',
      label: 'Pedido 8002', valor: 800, data: '2026-01-15T00:00:00Z', status: 'bost_Close' },
    { id: 'NOTA_FISCAL:2', tipo: 'NOTA_FISCAL', docEntry: 2, docNum: '7002', cardCode: 'CLI0000MOCK',
      label: 'Nota Fiscal 7002', valor: 800, data: '2026-01-22T00:00:00Z', status: 'bost_Close' },
    { id: 'DEVOLUCAO:1', tipo: 'DEVOLUCAO', docEntry: 1, docNum: '5001', cardCode: 'CLI0000MOCK',
      label: 'Devolução 5001', valor: 800, data: '2026-01-25T00:00:00Z', status: 'bost_Close' },
    //um de cada situacao, pra conferir as etiquetas (ver SITUACAO_BADGE)
    { id: 'LANCAMENTO_CONTABIL:1', tipo: 'LANCAMENTO_CONTABIL', docEntry: 1, docNum: '1', cardCode: null,
      label: 'Lançamento Contábil 1', valor: 12000, data: '2026-01-20T00:00:00Z', status: null, situacao: 'VFET' },
    { id: 'LANCAMENTO_CONTABIL:2', tipo: 'LANCAMENTO_CONTABIL', docEntry: 2, docNum: '2', cardCode: null,
      label: 'Lançamento Contábil 2', valor: 12000, data: '2026-01-21T00:00:00Z', status: null, situacao: 'VFEC' },
    { id: 'LANCAMENTO_CONTABIL:3', tipo: 'LANCAMENTO_CONTABIL', docEntry: 3, docNum: '3', cardCode: null,
      label: 'Lançamento Contábil 3', valor: 800, data: '2026-01-26T00:00:00Z', status: null, situacao: 'CanC' },
  ]

  const edges : Array<MapaEdge> = [
    { id: 'e1', from: 'CLIENTE:CLI0000MOCK', to: 'CONTRATO:1', tipo: 'ORIGEM' },
    { id: 'e2', from: 'CONTRATO:1', to: 'PEDIDO:1', tipo: 'PEDIDO_ORIGEM' },
    { id: 'e3', from: 'CONTRATO:1', to: 'COTACAO:1', tipo: 'GERADO_PARA_CONTRATO' },
    { id: 'e4', from: 'CONTRATO:1', to: 'ADIANTAMENTO:1', tipo: 'GERADO_PARA_CONTRATO' },
    { id: 'e5', from: 'CONTRATO:1', to: 'PEDIDO:2', tipo: 'GERADO_PARA_CONTRATO' },
    { id: 'e6', from: 'PEDIDO:1', to: 'NOTA_FISCAL:1', tipo: 'COPIA_DOCUMENTO' },
    { id: 'e7', from: 'NOTA_FISCAL:1', to: 'RECEBIMENTO:1', tipo: 'CONCILIACAO' },
    { id: 'e8', from: 'ADIANTAMENTO:1', to: 'NOTA_FISCAL:1', tipo: 'APROPRIACAO' },
    { id: 'e9', from: 'PEDIDO:2', to: 'NOTA_FISCAL:2', tipo: 'COPIA_DOCUMENTO' },
    { id: 'e10', from: 'NOTA_FISCAL:2', to: 'DEVOLUCAO:1', tipo: 'CONCILIACAO' },
    { id: 'e11', from: 'NOTA_FISCAL:1', to: 'LANCAMENTO_CONTABIL:1', tipo: 'CONCILIACAO' },
    { id: 'e12', from: 'NOTA_FISCAL:1', to: 'LANCAMENTO_CONTABIL:2', tipo: 'RECLASSIFICACAO' },
    { id: 'e13', from: 'NOTA_FISCAL:2', to: 'LANCAMENTO_CONTABIL:3', tipo: 'RECLASSIFICACAO' },
  ]

  return { root: 'CONTRATO:1', nodes, edges }
}
