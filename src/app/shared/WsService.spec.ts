import { ConfigService } from '../core/services/config.service';
import { WsService } from './WsService';

describe('WsService', () => {
  let logado: boolean;
  let service: WsService;
  const auth: any = { isLoggedIn: () => logado };

  beforeEach(() => {
    logado = true;
    localStorage.setItem('token', 'token-do-usuario');
    service = new WsService(new ConfigService(), auth);
  });

  afterEach(() => {
    service.disconnect();
    localStorage.removeItem('token');
  });

  it('envia o token no frame CONNECT', async () => {
    const client = (service as any).client;
    await client.beforeConnect(client);
    expect(client.connectHeaders).toEqual({ Authorization: 'token-do-usuario' });
  });

  it('nao conecta sem usuario logado', () => {
    logado = false;
    service.connect('http://localhost:8080/ws');
    expect((service as any).client.active).toBeFalse();
  });
});

describe('ConfigService.getWebSocket', () => {
  afterEach(() => localStorage.removeItem('host'));

  it('usa o host do localStorage, como as chamadas HTTP', () => {
    localStorage.setItem('host', 'https://back.exemplo/v7/');
    expect(new ConfigService().getWebSocket()).toBe('https://back.exemplo/v7/ws');
  });

  it('webSocket explicito tem precedencia', () => {
    const config: ConfigService = Object.assign(new ConfigService(), { webSocket: 'wss://outro/ws' } as any);
    expect(config.getWebSocket()).toBe('wss://outro/ws');
  });
});
