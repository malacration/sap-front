import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from '../../../core/services/config.service';
import { CadastroRelatorioService } from './cadastro-relatorio.service';

describe('CadastroRelatorioService', () => {
  let http: HttpTestingController;
  let service: CadastroRelatorioService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CadastroRelatorioService,
        { provide: ConfigService, useValue: { getHostRelatorios: () => '/api/v1' } },
        provideHttpClient(withXhr(), withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CadastroRelatorioService);
  });
  afterEach(() => http.verify());

  it('CadastroRelatorioService nao e providedIn root', () => {
    expect((CadastroRelatorioService as any).ɵprov?.providedIn).not.toBe('root');
  });

  it('busca o tipo no sap-reports com o termo em q', () => {
    let pagina: any;
    service.buscar('conta_contabil', '1.1%').subscribe(resposta => pagina = resposta);
    const req = http.expectOne(r => r.url === '/api/v1/relatorios/cadastros/conta_contabil');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('1.1%');
    req.flush({ content: [{ codigo: '1.1.01', nome: 'Caixa' }], nextLink: '' });
    expect(pagina.content).toEqual([{ codigo: '1.1.01', nome: 'Caixa' }]);
  });
});
