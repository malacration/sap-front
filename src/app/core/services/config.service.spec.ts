import { ConfigService } from './config.service';

describe('ConfigService: endereco do sap-reports', () => {
  let config: ConfigService;
  beforeEach(() => {
    localStorage.removeItem('hostRelatorios');
    localStorage.removeItem('host');
    config = new ConfigService();
  });
  afterEach(() => localStorage.removeItem('hostRelatorios'));

  it('sem configuracao usa /reports na origem do back', () => {
    (config as any).host = 'https://cadastro-back.sustennutri.com.br';
    expect(config.getHostRelatorios()).toBe('https://cadastro-back.sustennutri.com.br/reports/api/v1');
  });

  it('ignora o caminho do back (o /v7 nao pode prefixar o /reports)', () => {
    (config as any).host = 'https://cadastro-back.sustennutri.com.br/v7/';
    expect(config.getHostRelatorios()).toBe('https://cadastro-back.sustennutri.com.br/reports/api/v1');
  });

  it('hostRelatorios configurado tem precedencia', () => {
    (config as any).host = 'https://cadastro-back.sustennutri.com.br';
    (config as any).hostRelatorios = 'http://localhost:2030/';
    expect(config.getHostRelatorios()).toBe('http://localhost:2030/api/v1');
  });
});
