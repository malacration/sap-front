import Keycloak, { KeycloakInitOptions } from 'keycloak-js';

export interface KeycloakClientConfig {
  url: string;
  realm: string;
  clientId: string;
}

export interface AuthConfig {
  mode: 'internal' | 'keycloak';
  keycloak?: KeycloakClientConfig | null;
}

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'kc_refresh_token';

/**
 * Validade minima (segundos) exigida do access token. Se faltar menos que
 * isso para expirar, o keycloak-js troca o refresh token por um novo access
 * token antes de a requisicao sair.
 */
const MIN_VALIDITY = 30;

/** Guardado no init para que clearTokens() saiba reconhecer tokens deste realm. */
let clientConfig: KeycloakClientConfig | null = null;

/**
 * Inicializa o adapter oficial keycloak-js antes do bootstrap do Angular.
 *
 * Estrategia (sem o iframe de silent check-sso, que se mostrou instavel):
 *  - Se a URL tem o callback do login (volta do kc.login), processa o code.
 *  - Senao, restaura a sessao a partir do token/refresh_token salvos em
 *    localStorage (sem redirect e sem iframe).
 *  - Sem sessao, o usuario segue deslogado e o botao da tela /login dispara o
 *    redirect para o Keycloak.
 *
 * O access token fica em localStorage('token'), de onde o JwtInterceptor o
 * envia no header Authorization; o backend valida (RS256, via JWKS).
 *
 * A renovacao tem duas camadas: o timer do proprio keycloak-js
 * (`onTokenExpired`) e o `ensureFreshToken()` chamado pelo JwtInterceptor a
 * cada requisicao. A segunda existe porque `setTimeout` nao e confiavel com a
 * aba em background ou a maquina suspensa — nesses casos o timer atrasa e o
 * token expiraria antes de ser renovado.
 */
export async function initKeycloak(config: KeycloakClientConfig): Promise<void> {
  clientConfig = config;

  const keycloak = new Keycloak({
    url: config.url,
    realm: config.realm,
    clientId: config.clientId,
  });
  (window as any).keycloak = keycloak;

  // ATENCAO: estes handlers precisam ser registrados ANTES do init(). O
  // keycloak-js so agenda o timer de expiracao dentro de setToken(), e apenas
  // se `kc.onTokenExpired` ja existir naquele instante (ver dist/keycloak.js:
  // `if (kc.onTokenExpired) { ... setTimeout(kc.onTokenExpired, expiresIn) }`).
  // Registrar depois do init deixaria a renovacao automatica desligada para
  // sempre, porque nenhum setToken novo voltaria a acontecer.
  keycloak.onTokenExpired = () => {
    keycloak
      .updateToken(MIN_VALIDITY)
      .then(() => persist(keycloak))
      .catch(() => clearTokens());
  };
  // Toda renovacao — inclusive as disparadas pelo interceptor — precisa
  // espelhar o token novo no localStorage, que e de onde o JwtInterceptor le.
  keycloak.onAuthRefreshSuccess = () => persist(keycloak);

  const hasCallback = /(?:[?#&])(code|error|state)=/.test(
    window.location.search + window.location.hash
  );
  const storedToken = localStorage.getItem(TOKEN_KEY);
  const storedRefresh = localStorage.getItem(REFRESH_KEY);

  const initOptions: KeycloakInitOptions = {
    pkceMethod: 'S256',
    checkLoginIframe: false,
    // Keycloak novo nao inclui `nonce` no access token; o keycloak-js v21
    // compara o nonce do access token e falharia ("Invalid nonce"). O PKCE
    // (S256) ja protege a troca do code, entao desabilitamos a checagem.
    useNonce: false,
  };
  // Fora do callback, restaura a sessao a partir dos tokens salvos.
  if (!hasCallback && storedRefresh) {
    initOptions.refreshToken = storedRefresh;
    if (storedToken) initOptions.token = storedToken;
  }

  try {
    const authenticated = await keycloak.init(initOptions);
    console.info('[keycloak] init concluido. authenticated =', authenticated);

    if (authenticated) {
      // Garante um access token valido (o salvo pode estar expirado). Na
      // restauracao via localStorage o timeSkew ainda e nulo, entao esta
      // chamada sempre renova — e e ela que agenda o primeiro timer.
      try {
        await keycloak.updateToken(MIN_VALIDITY);
      } catch (e) {
        console.warn('[keycloak] nao foi possivel renovar o token no init', e);
      }
      persist(keycloak);
      console.info('[keycloak] sessao ativa, token salvo em localStorage.token');
    } else {
      console.warn('[keycloak] sem sessao ativa (usuario deslogado)');
      clearTokens();
    }
  } catch (e) {
    console.error('[keycloak] falha ao inicializar', e);
    clearTokens();
  }
}

/** Verdadeiro quando a aplicacao subiu em modo Keycloak. */
export function isKeycloakSession(): boolean {
  return !!(window as any).keycloak;
}

/**
 * Devolve um access token valido para a proxima requisicao, renovando-o se
 * estiver perto de expirar.
 *
 * Em modo interno (login por usuario/senha ou OTP de cliente externo) nao ha
 * adapter do Keycloak e o token do localStorage e repassado como esta.
 *
 * Chamadas concorrentes sao seguras: o keycloak-js enfileira (refreshQueue) e
 * dispara um unico POST ao token endpoint, resolvendo todas com o mesmo token.
 */
export async function ensureFreshToken(): Promise<string | null> {
  const keycloak: Keycloak | undefined = (window as any).keycloak;
  if (!keycloak?.authenticated) {
    return localStorage.getItem(TOKEN_KEY);
  }

  try {
    await keycloak.updateToken(MIN_VALIDITY);
    persist(keycloak);
    return keycloak.token ?? null;
  } catch (e) {
    // Refresh token expirado ou revogado: a sessao acabou. O 401 que vier em
    // seguida leva o usuario para /login (ver ErrorInterceptor).
    console.warn('[keycloak] falha ao renovar o access token', e);
    clearTokens();
    return null;
  }
}

function persist(keycloak: Keycloak): void {
  if (keycloak.token) localStorage.setItem(TOKEN_KEY, keycloak.token);
  if (keycloak.refreshToken) localStorage.setItem(REFRESH_KEY, keycloak.refreshToken);
}

/**
 * Limpa os tokens do Keycloak. Preserva um eventual token interno (ex.: OTP de
 * cliente externo), removendo o `token` apenas quando ele for do Keycloak.
 */
export function clearTokens(): void {
  localStorage.removeItem(REFRESH_KEY);
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored && isKeycloakToken(stored)) {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/** Verifica, sem validar assinatura, se o token foi emitido por este realm. */
function isKeycloakToken(token: string): boolean {
  if (!clientConfig) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const issuer = `${clientConfig.url.replace(/\/$/, '')}/realms/${clientConfig.realm}`;
    return (payload.iss || '').replace(/\/$/, '') === issuer;
  } catch {
    return false;
  }
}
