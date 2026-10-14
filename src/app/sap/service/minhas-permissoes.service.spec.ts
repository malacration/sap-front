import { HttpContext } from '@angular/common/http';
import { NGX_LOADING_BAR_IGNORED } from '@ngx-loading-bar/http-client';
import { of } from 'rxjs';
import { SILENT_ERRORS } from '../../interceptors/error.interceptor';
import { MinhasPermissoesService } from './minhas-permissoes.service';

describe('MinhasPermissoesService', () => {
  it('posta a lista no endpoint do host, sem modal de erro e sem barra de progresso', () => {
    const chamadas: { url: string; corpo: unknown; context: HttpContext }[] = [];
    const http = {
      post: (url: string, corpo: unknown, opcoes: { context: HttpContext }) => {
        chamadas.push({ url, corpo, context: opcoes.context });
        return of([]);
      },
    };
    const service = new MinhasPermissoesService({ getHost: () => 'http://back/v7' } as any, http as any);

    service.consultar([{ metodo: 'get', caminho: '/carregamento' }]).subscribe();

    expect(chamadas.length).toBe(1);
    expect(chamadas[0].url).toBe('http://back/v7/acesso/minhas-permissoes');
    expect(chamadas[0].corpo).toEqual([{ metodo: 'get', caminho: '/carregamento' }]);
    expect(chamadas[0].context.get(SILENT_ERRORS)).toBeTrue();
    expect(chamadas[0].context.get(NGX_LOADING_BAR_IGNORED)).toBeTrue();
  });
});
