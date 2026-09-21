export type FormatoRelatorio = 'pdf' | 'html' | 'csv';

export type TipoParametro =
  | 'texto'
  | 'numero'
  | 'date'
  | 'datetime'
  | 'booleano'
  | 'lista'
  | 'filial'
  | 'vendedor'
  | 'parceiro_negocio'
  | 'item'
  | 'localidade';

export type TipoColuna =
  | 'texto'
  | 'numero'
  | 'moeda'
  | 'data'
  | 'datahora'
  | 'percentual';

export type AlinhamentoColuna = 'esquerda' | 'centro' | 'direita';
export type StatusRelatorio = 'RASCUNHO' | 'PUBLICADO';
export type AcaoAuditoria = 'CRIOU' | 'NOVA_VERSAO' | 'PUBLICOU' | 'ROLLBACK' | 'REMOVEU';

export type RegraProblema =
  | 'schema_invalido'
  | 'parametro_ausente'
  | 'parametro_nao_usado'
  | 'nome_parametro_invalido'
  | 'sql_com_comentario'
  | 'sql_multiplas_instrucoes'
  | 'sql_nao_e_select'
  | 'tabela_nao_permitida'
  | 'template_nao_compila'
  | 'escape_desabilitado'
  | 'tag_proibida'
  | 'recurso_externo_proibido'
  | 'limite_excedido';

export interface RelatorioResumo {
  id: number;
  nome: string;
  descricao?: string | null;
  formatos: FormatoRelatorio[];
  versaoPublicada: number;
  atualizadoEm?: string;
}

export interface RelatorioDetalhe extends RelatorioResumo {
  parametros: Parametro[];
  colunas: Coluna[];
}

export interface OpcaoParametro {
  valor?: string;
  rotulo?: string;
}

export interface Parametro {
  multiplo?: boolean;
  nome: string;
  tipo: TipoParametro;
  rotulo?: string | null;
  obrigatorio: boolean;
  padrao?: unknown | null;
  opcoes?: OpcaoParametro[] | null;
}

export interface Coluna {
  campo: string;
  titulo: string;
  tipo?: TipoColuna;
  alinhamento?: AlinhamentoColuna | null;
  total?: TipoTotal | null;
}

export interface RenderRequest {
  params: Record<string, unknown>;
  /** Logo do sistema em data: URI; o serviço expõe ao template como {{meta.logo}}. */
  logo?: string | null;
}

export interface UploadRequest {
  definicao: string;
  template: string;
}

export interface RelatorioAdmin {
  id: number;
  nome: string;
  descricao?: string | null;
  status: StatusRelatorio;
  ultimaVersao: number;
  versaoPublicada?: number | null;
  papeis: string[];
  formatos?: FormatoRelatorio[];
  criadoPor?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface RelatorioAdminDetalhe extends RelatorioAdmin {
  versao: number;
  definicao: string;
  template: string;
}

export interface ValidacaoOk {
  valido: true;
  tabelas?: string[];
  parametros?: string[];
}

export interface Problema {
  caminho: string;
  regra: RegraProblema;
  mensagem: string;
  linha?: number | null;
}

export interface ValidacaoFalha {
  erro: 'validacao_falhou';
  mensagem: string;
  problemas: Problema[];
}

export interface ProblemasPorCaminho {
  caminho: string;
  problemas: Problema[];
}

export interface Versao {
  versao: number;
  criadoPor: string;
  criadoEm: string;
  publicadoEm?: string | null;
  publicada: boolean;
}

export interface EventoAuditoria {
  quem: string;
  quando: string;
  acao: AcaoAuditoria;
  versao?: number | null;
}

export interface Erro {
  erro: string;
  mensagem: string;
}

export type TipoTotal = 'sum' | 'avg' | 'min' | 'max' | 'count';

/** Exemplo pronto servido pelo backend (mesma fonte da skill de IA). */
export interface ExemploRelatorio {
  id: string;
  nome: string;
  descricao?: string | null;
  definicao: string;
  template: string;
}
