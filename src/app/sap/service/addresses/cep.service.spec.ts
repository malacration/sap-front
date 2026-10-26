import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpInterceptor } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CepService } from './cep.service';

/** Interceptor que marcaria a chamada: a consulta de CEP nao pode passar por ele. */
class MarcaInterceptor implements HttpInterceptor {
  intercept(req, next) { return next.handle(req.clone({ setHeaders: { Authorization: 'Bearer segredo' } })); }
}

describe('CepService', () => {

  let service: CepService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: HTTP_INTERCEPTORS, useClass: MarcaInterceptor, multi: true }],
    });
    service = TestBed.inject(CepService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta o ViaCEP so com os digitos e sem o token do app', () => {
    let resultado;
    service.consulta('76801-000').subscribe(it => resultado = it);

    const req = http.expectOne('https://viacep.com.br/ws/76801000/json/');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ cep: '76801-000', uf: 'RO', ibge: '1100205' });

    expect(resultado.ibge).toBe('1100205');
  });

  it('CEP inexistente (erro: true) volta null', () => {
    let resultado = 'nao respondeu' as any;
    service.consulta('00000000').subscribe(it => resultado = it);
    http.expectOne('https://viacep.com.br/ws/00000000/json/').flush({ erro: true });
    expect(resultado).toBeNull();
  });

  it('falha de rede volta null', () => {
    let resultado = 'nao respondeu' as any;
    service.consulta('76801000').subscribe(it => resultado = it);
    http.expectOne('https://viacep.com.br/ws/76801000/json/').error(new ProgressEvent('error'));
    expect(resultado).toBeNull();
  });

  it('CEP incompleto nem consulta', () => {
    let resultado = 'nao respondeu' as any;
    service.consulta('7680').subscribe(it => resultado = it);
    http.expectNone(() => true);
    expect(resultado).toBeNull();
  });
});
