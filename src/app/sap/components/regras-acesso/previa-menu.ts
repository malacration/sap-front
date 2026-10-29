import { Route } from '@angular/router';
import { ApiDaRota, apisDaRota, dependenciasDaRota, flagsDaRota } from '../../../core/route-flags';

/** Uma tela (ou grupo) como apareceria no menu de quem tem os perfis simulados. */
export interface ItemPrevia {
  titulo: string;
  icone: string;
  filhos: ItemPrevia[];
  /** Chamadas da tela (principal ou "usa:") que os perfis não liberam: "GET /branch". A tela abre, mas essas dão 403. */
  faltando: string[];
  /** Apareceu pelo nome do perfil ("role:"), não pela permissão da URL. */
  peloNome: boolean;
}

export interface OpcoesPrevia {
  perfis: string[];
  /** "get /x" -> liberado? Resposta do simulador para cada api:/usa: das rotas. */
  respostas: Record<string, boolean>;
  menuPorPermissao: boolean;
  modoOperacao: string;
}

/** Todas as api: e usa: do router.config, sem repetir: o que a prévia pergunta ao backend. */
export function consultasDasRotas(rotas: Route[]): ApiDaRota[] {
  const porChave = new Map<string, ApiDaRota>();
  const visitar = (lista: Route[] | undefined) => {
    for (const rota of lista ?? []) {
      [...apisDaRota(rota), ...dependenciasDaRota(rota)].forEach(api => porChave.set(api.chave, api));
      visitar(rota.children);
    }
  };
  visitar(rotas);
  return [...porChave.values()];
}

/**
 * O menu de um usuario interno logado com esses perfis, pela mesma regra do MenuSidebarComponent (role-not, api: com a
 * flag, role: sem ela ou sem api:, grupo some sem filho visivel). Fica de fora o que depende do aparelho (modo offline).
 */
export function previaDoMenu(rotas: Route[], o: OpcoesPrevia): ItemPrevia[] {
  const tem = (perfil: string) => o.perfis.includes(perfil);
  const liberada = (api: ApiDaRota) => o.respostas[api.chave] === true;

  const montar = (lista: Route[]): ItemPrevia[] => lista
    .filter(rota => rota.title !== undefined && !entrada(rota, 'hidden') && rota.path !== 'faturas'
      && entrada(rota, 'internal') === (o.modoOperacao === 'internal'))
    .filter(rota => !flagsDaRota(rota, 'role-not').some(tem))
    .flatMap(rota => {
      const apis = apisDaRota(rota);
      const filhos = rota.children ? montar(rota.children) : [];
      let visivel: boolean;
      let peloNome = false;
      if (o.menuPorPermissao && apis.length) {
        visivel = apis.some(liberada);
      } else if (o.menuPorPermissao && rota.children?.length) {
        visivel = filhos.length > 0 || !!rota.component || !!rota.redirectTo;
      } else {
        const exigidas = flagsDaRota(rota, 'role');
        visivel = !exigidas.length || tem('admin') || exigidas.some(tem);
        peloNome = exigidas.length > 0;
      }
      if (!visivel) { return []; }
      // /tela/... e permissao so de menu: nenhuma chamada vai para ela, entao nao "da 403" dentro da tela.
      const faltando = [...apis, ...dependenciasDaRota(rota)]
        .filter(api => !liberada(api) && !api.caminho.startsWith('/tela/'))
        .map(api => `${api.metodo.toUpperCase()} ${api.caminho}`);
      return [{ titulo: String(rota.title), icone: icone(rota), filhos, faltando, peloNome }];
    });

  return montar(rotas);
}

function entrada(rota: Route, valor: string): boolean {
  return Array.isArray(rota.data) && rota.data.some(it => String(it) === valor);
}

function icone(rota: Route): string {
  const achado = Array.isArray(rota.data) ? rota.data.find(it => String(it).startsWith('icon:')) : undefined;
  return achado ? String(achado).substring('icon:'.length) : 'fas fa-circle';
}
