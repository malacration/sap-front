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
 * Inicializa o adapter oficial keycloak-js antes do bootstrap do Angular.
 *
 * Estrategia (sem o iframe de silent check-sso, que se mostrou instavel):
 *  - Se a URL tem o callback do login (volta do kc.login), processa o code.
 *  - Senao, restaura a sessao a partir do token/refresh_token salvos em
 *    localStorage (sem redirect e sem iframe). O keycloak-js renova sozinho
 *    usando o refresh_token.
 *  - Sem sessao, o usuario segue deslogado e o botao da tela /login dispara o
 *    redirect para o Keycloak.
 *
 * O access token fica em localStorage('token'), de onde o JwtInterceptor o
 * envia no header Authorization; o backend valida (RS256, via JWKS).
 */
export async function initKeycloak(config: KeycloakClientConfig): Promise<void> {
  const keycloak = new Keycloak({
    url: config.url,
    realm: config.realm,
    clientId: config.clientId,
  });
  (window as any).keycloak = keycloak;

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
      // Garante um access token valido (o salvo pode estar expirado).
      try {
        await keycloak.updateToken(60);
      } catch (e) {
        console.warn('[keycloak] nao foi possivel renovar o token no init', e);
      }
      persist(keycloak);
      console.info('[keycloak] sessao ativa, token salvo em localStorage.token');

      keycloak.onTokenExpired = () => {
        keycloak
          .updateToken(70)
          .then(() => persist(keycloak))
          .catch(() => clearTokens(config));
      };
    } else {
      console.warn('[keycloak] sem sessao ativa (usuario deslogado)');
      clearTokens(config);
    }
  } catch (e) {
    console.error('[keycloak] falha ao inicializar', e);
    clearTokens(config);
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
function clearTokens(config: KeycloakClientConfig): void {
  localStorage.removeItem(REFRESH_KEY);
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored && isKeycloakToken(stored, config)) {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/** Verifica, sem validar assinatura, se o token foi emitido por este realm. */
function isKeycloakToken(token: string, config: KeycloakClientConfig): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const issuer = `${config.url.replace(/\/$/, '')}/realms/${config.realm}`;
    return (payload.iss || '').replace(/\/$/, '') === issuer;
  } catch {
    return false;
  }
}
