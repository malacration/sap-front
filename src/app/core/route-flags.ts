/**
 * Marcacoes do `data` das rotas deste app. Aqui o `data` e um array de strings, fora do padrao do
 * Angular: ["icon:fas fa-x", "role:vendedor", "role-not:business_partner", "api:get:/carregamento", "hidden"].
 *
 * Menu e guards leem por aqui para os dois entenderem a rota do mesmo jeito.
 */

/** Rota do router.config (tem `data`) ou snapshot da rota ativa (tem `routeConfig` e `data`). */
type ComData = { data?: unknown; routeConfig?: { data?: unknown } | null };

export type Marcacao = 'role' | 'role-not' | 'api';

/** Uma chamada ao backend que a tela declara como principal: "api:get:/carregamento". */
export interface ApiDaRota {
  metodo: string;
  caminho: string;
  /** "get /carregamento": chave das respostas do backend. */
  chave: string;
}

/**
 * Entradas do `data`. No snapshot o array pode vir espalhado num objeto ({0: .., 1: ..}), por isso le primeiro
 * o routeConfig.data (o array original) e cai para Object.values.
 */
export function entradasDaRota(route: ComData | null | undefined): string[] {
  const raw: unknown = route?.routeConfig?.data ?? route?.data ?? [];
  const lista: unknown[] = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
  return lista.map(it => it?.toString() ?? '');
}

/** Valores de uma marcacao, sem o prefixo. Corta por substring: um ":" dentro do valor e preservado. */
export function flagsDaRota(route: ComData | null | undefined, marcacao: Marcacao): string[] {
  const prefixo = `${marcacao}:`;
  return entradasDaRota(route)
    .filter(it => it.startsWith(prefixo))
    .map(it => it.substring(prefixo.length));
}

/** "get:/x/*" -> {metodo: "get", caminho: "/x/*"}; null se faltar o metodo ou o caminho. */
export function lerApi(valor: string): ApiDaRota | null {
  const separador = valor.indexOf(':');
  if (separador <= 0) {
    return null;
  }
  const metodo = valor.substring(0, separador).trim().toLowerCase();
  const caminho = valor.substring(separador + 1).trim();
  if (!metodo || !caminho) {
    return null;
  }
  return { metodo, caminho, chave: `${metodo} ${caminho}` };
}

export function apisDaRota(route: ComData | null | undefined): ApiDaRota[] {
  return flagsDaRota(route, 'api')
    .map(lerApi)
    .filter((it): it is ApiDaRota => it !== null);
}
