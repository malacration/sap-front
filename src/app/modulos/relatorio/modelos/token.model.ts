/** Resposta da criação: o `token` só existe aqui, uma única vez. */
export interface TokenCriado {
  id: string;
  nome: string;
  token: string;
  expiraEm: string;
  aviso: string;
}

export interface TokenResumo {
  id: string;
  nome: string;
  /** Primeiros caracteres, para identificar qual é qual na lista. */
  prefixo: string;
  criadoPor: string;
  criadoEm: string;
  expiraEm: string;
  revogadoEm: string | null;
  ultimoUso: string | null;
  ativo: boolean;
  expirado: boolean;
}
