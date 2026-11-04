# SAP Portal

Aplicação web/PWA em Angular 22.2.4, CLI/build 22.2.5 e TypeScript 6.0.3. Electron foi removido. O build usa esbuild/Vite (`@angular/build`) e mantém a saída em `dist/` para Nginx e releases existentes.

## Desenvolvimento e verificação

```sh
nvm install
nvm use
npm ci
# Copie src/config.example para src/config e ajuste o host do backend local.
npm start
npm run lint
npm run web:build
CHROME_BIN=/usr/bin/google-chrome npm test -- --browsers=ChromeHeadless
```

Node 26.13.0 LTS está fixado em `.nvmrc` e `.node-version`. A configuração local `src/config` não entra nas imagens; o build Docker usa o exemplo e o Nginx recebe `/config` em runtime. `Dockerfile` gera a imagem de produção, `Dockerfile.hmg` mantém a configuração externa da homologação e `Dockerfile.dev` usa o proxy fornecido pelo Compose. O container de desenvolvimento sincroniza as dependências do volume com o lockfile ao iniciar.

## Compatibilidade preservada

- NgModules, Zone.js e detecção de mudanças Eager foram preservados pelas migrações oficiais para manter o comportamento dos componentes existentes.
- AdminLTE 3/Bootstrap 4 permanecem para preservar o layout. Seus avisos de Sass e depreciação continuam visíveis; a troca para AdminLTE 4/Bootstrap 5 exige revisão visual específica.
- CodeMirror permanece na linha 5 porque o editor utiliza sua API global e seus modos. A linha 6 exige reescrever o editor.
- O wrapper Angular obsoleto de Dropzone foi removido; o adaptador existente usa diretamente a engine 5.9.3.
- `ngx-toastr` depende de `ComponentFactoryResolver`, removido no Angular 22. As chamadas de notificação usam agora `core/services/toastr.service.ts`, com texto seguro, títulos, timeout e prevenção de duplicatas.
- Jasmine 6 é usado com Zone.js; Jasmine 7 tornou as funções globais imutáveis e impede o patch do executor Zone. O front PIX, que é zoneless, pode usar Jasmine 7.

Autenticação real (Keycloak), sincronização offline e operações no SAP devem ser homologadas com os respectivos serviços. Os testes locais não executam operações financeiras reais.
