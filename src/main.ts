import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { AppModule } from './app/app.module';
import { APP_CONFIG } from './environments/environment';

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


fetch('config')
  .then(response => response.json())
  .then(conf => {
    bootstrap()
    // @ts-ignore
    window['app-config'] = conf;
  })
  .catch(bootstrap);