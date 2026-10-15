import { apisDaRota, entradasDaRota, flagsDaRota, lerApi } from './route-flags';

describe('route-flags', () => {
  const data = ['icon:fas fa-x', 'role:vendedor', 'role-not:business_partner', 'api:get:/sales-person/replace/*/por/*', 'hidden'];

  it('le do array da rota e do snapshot espalhado em objeto', () => {
    expect(entradasDaRota({ data })).toEqual(data);
    expect(entradasDaRota({ routeConfig: { data }, data: Object.assign({}, ['outro']) })).toEqual(data);
    expect(entradasDaRota({ data: { ...data } })).toEqual(data);
    expect(entradasDaRota({})).toEqual([]);
    expect(entradasDaRota(null)).toEqual([]);
  });

  it('separa role de role-not e corta so o prefixo', () => {
    expect(flagsDaRota({ data }, 'role')).toEqual(['vendedor']);
    expect(flagsDaRota({ data }, 'role-not')).toEqual(['business_partner']);
    expect(flagsDaRota({ data }, 'api')).toEqual(['get:/sales-person/replace/*/por/*']);
  });

  it('le a api preservando dois-pontos no caminho', () => {
    expect(lerApi('GET:/x:y')).toEqual({ metodo: 'get', caminho: '/x:y', chave: 'get /x:y' });
    expect(lerApi(' post : /locais/search ')).toEqual({ metodo: 'post', caminho: '/locais/search', chave: 'post /locais/search' });
  });

  it('descarta api sem metodo ou sem caminho', () => {
    expect(lerApi('/sem-metodo')).toBeNull();
    expect(lerApi(':/x')).toBeNull();
    expect(lerApi('get:')).toBeNull();
    expect(apisDaRota({ data: ['api:get:/a', 'api:quebrada', 'api:post:/b'] }).map(a => a.chave)).toEqual(['get /a', 'post /b']);
  });
});
