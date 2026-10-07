import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfigService } from '../../core/services/config.service';
import { ImportacaoLancamentoService } from './importacao-lancamento.service';

describe('ImportacaoLancamentoService', () => {
  let http: HttpTestingController;
  let service: ImportacaoLancamentoService;
  const arquivo = new File(['Filial;...\r\n1;;05/10/2026;D;C;10,00;H;;'], 'outubro.csv', { type: 'application/vnd.ms-excel' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ImportacaoLancamentoService,
        { provide: ConfigService, useValue: { getHost: () => '/api' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ImportacaoLancamentoService);
  });

  afterEach(() => http.verify());

  it('valida mandando o arquivo cru como text/csv, com o nome', () => {
    service.validar(arquivo).subscribe();
    const req = http.expectOne(r => r.url === '/api/journal/importacao/validar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(arquivo);
    // O Windows marca .csv como application/vnd.ms-excel; o tipo vai fixo.
    expect(req.request.headers.get('Content-Type')).toBe('text/csv');
    expect(req.request.params.get('arquivo')).toBe('outubro.csv');
    req.flush({});
  });

  it('importa com o hash da prévia e a confirmação de reimportação', () => {
    service.importar(arquivo, 'abc', true).subscribe();
    const req = http.expectOne(r => r.url === '/api/journal/importacao');
    expect(req.request.body).toBe(arquivo);
    expect(req.request.params.get('hash')).toBe('abc');
    expect(req.request.params.get('forcarDuplicado')).toBe('true');
    req.flush({});
  });

  it('lê o histórico', () => {
    let historico: unknown[] = null;
    service.historico().subscribe(h => historico = h);
    http.expectOne(r => r.method === 'GET' && r.url === '/api/journal/importacao/historico').flush([]);
    expect(historico).toEqual([]);
  });
});
