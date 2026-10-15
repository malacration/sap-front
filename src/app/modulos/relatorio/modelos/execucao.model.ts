import { FormatoRelatorio } from './relatorio.model';

/** EXCLUIDO: concluiu, mas o arquivo ja foi apagado pela retencao (24h). */
export type StatusExecucao = 'PENDENTE' | 'EXECUTANDO' | 'CONCLUIDO' | 'FALHOU' | 'EXCLUIDO';

export interface Execucao {
  id: string;
  /** RENDER = aba Executar; PREVIEW = prévia da aba Criar / Editar. */
  tipo: 'RENDER' | 'PREVIEW';
  relatorioId: number;
  relatorioNome: string;
  versao: number | null;
  formato: FormatoRelatorio;
  /** Os mesmos parâmetros do pedido: é com eles que se gera de novo. */
  params: Record<string, unknown>;
  status: StatusExecucao;
  criadoEm: string;
  iniciadoEm: string | null;
  concluidoEm: string | null;
  expiraEm: string | null;
  erro: { status: number; erro: string; mensagem: string } | null;
  arquivo: { nome: string; contentType: string; extensao: string; tamanho: number } | null;
}

export const EXECUCAO_ATIVA: StatusExecucao[] = ['PENDENTE', 'EXECUTANDO'];
