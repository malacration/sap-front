import { of } from 'rxjs';
import { NotaFiscalLoteService } from './nota-fiscal-lote.service';

describe('NotaFiscalLoteService.importarPlanilha', () => {
  function servico() {
    const http = jasmine.createSpyObj('HttpClient', ['post']);
    http.post.and.returnValue(of({ linhas: [], documentos: [] }));
    const service = new NotaFiscalLoteService({ getHost: () => 'http://x' } as any, http);
    return { service, http };
  }
  const arquivo = new Blob(['x']);

  it('modo padrao nao manda parametros', () => {
    const { service, http } = servico();
    service.importarPlanilha(arquivo, 'NOSSO_NUMERO').subscribe();
    expect(http.post.calls.mostRecent().args[2].params.keys()).toEqual([]);
  });

  it('NUMERO_NOTA manda so o modo, sem filtro', () => {
    const { service, http } = servico();
    service.importarPlanilha(arquivo, 'NUMERO_NOTA').subscribe();
    const params = http.post.calls.mostRecent().args[2].params;
    expect(params.keys()).toEqual(['modo']);
    expect(params.get('modo')).toBe('NUMERO_NOTA');
  });
});

describe('NotaFiscalLoteService.editarCessionaria', () => {
  it('manda PATCH com nome e nomePdf para a cessionaria', () => {
    const http = jasmine.createSpyObj('HttpClient', ['patch']);
    http.patch.and.returnValue(of({ codigo: 'C 1', nome: 'N', nomePdf: null }));
    const service = new NotaFiscalLoteService({ getHost: () => 'http://x' } as any, http);
    service.editarCessionaria('C 1', { nome: 'N', nomePdf: null }).subscribe();
    const [url, corpo] = http.patch.calls.mostRecent().args;
    expect(url.endsWith('/cessionarias/C%201')).toBeTrue();
    expect(corpo).toEqual({ nome: 'N', nomePdf: null });
  });
});
