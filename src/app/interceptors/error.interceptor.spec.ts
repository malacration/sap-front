import { HttpErrorResponse } from '@angular/common/http';
import { ErrorInterceptor } from './error.interceptor';

describe('ErrorInterceptor.getMsgError', () => {

  const interceptor = new ErrorInterceptor({} as any, {} as any);

  function erroBlob(texto: string, tipo = 'application/json'): HttpErrorResponse {
    return new HttpErrorResponse({ status: 400, error: new Blob([texto], { type: tipo }) });
  }

  // Download (responseType blob) recebe o erro JSON do backend como Blob.
  it('erro JSON vindo como blob mostra so a mensagem', async () => {
    const msg = await interceptor.getMsgError(erroBlob('{"mensagem":"O lote aceita no maximo 200 notas"}'));
    expect(msg).toBe('O lote aceita no maximo 200 notas');
  });

  it('blob que nao e JSON mostra o texto como veio', async () => {
    expect(await interceptor.getMsgError(erroBlob('Bad Gateway', 'text/plain'))).toBe('Bad Gateway');
  });

  it('JSON sem mensagem mostra o texto', async () => {
    expect(await interceptor.getMsgError(erroBlob('{"erro":"x"}'))).toBe('{"erro":"x"}');
  });
});
