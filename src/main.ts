import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { AppModule } from './app/app.module';
import { APP_CONFIG } from './environments/environment';
import { AuthConfig, initKeycloak } from './app/core/keycloak';

if (APP_CONFIG.production) {
  enableProdMode();
}

(window as any).PF = {
  config: {
      mode: 'bs4'
  }
};

function bootstrapFailed() {
  document.querySelector('app-root')!.innerHTML = 'Não foi possível carregar as configurações. Por favor, tente novamente.';
}

function bootstrap() {
  platformBrowserDynamic()
    .bootstrapModule(AppModule, {preserveWhitespaces: false})
    .catch((err: any) => console.error(err));
}


function resolveHost(conf: any): string {
  return (conf && conf.host) || localStorage.getItem('host') || 'http://localhost:8080';
}

// Pergunta ao backend qual o modo de autenticacao e, se for Keycloak,
// inicializa o adapter OIDC antes do bootstrap do Angular.
async function setupAuth(conf: any): Promise<void> {
  const host = resolveHost(conf);
  try {
    const authConfig: AuthConfig = await fetch(`${host}/auth/config`).then(r => r.json());
    // @ts-ignore
    window['auth-config'] = authConfig;
    if (authConfig.mode === 'keycloak' && authConfig.keycloak) {
      await initKeycloak(authConfig.keycloak);
    }
  } catch (e) {
    console.error('Nao foi possivel obter o modo de autenticacao do backend', e);
    // fallback: assume modo interno
    // @ts-ignore
    window['auth-config'] = { mode: 'internal' };
  }
}

fetch('config')
  .then(response => response.json())
  .then(async conf => {
    // @ts-ignore
    window['app-config'] = conf;
    await setupAuth(conf);
    bootstrap();
  })
  .catch(async () => {
    await setupAuth(null);
    bootstrap();
  });
