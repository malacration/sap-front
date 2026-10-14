import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NavigationEnd, Routes } from '@angular/router';
import { BehaviorSubject, NEVER, Observable, Subject, of, throwError } from 'rxjs';
import { PermissaoConsulta } from '../sap/service/minhas-permissoes.service';
import { PermissoesApiService } from './permissoes-api.service';
import { ApiDaRota, lerApi } from './route-flags';

describe('PermissoesApiService', () => {
  const rotas: Routes = [
    { path: 'home' },
    {
      path: 'logistica', data: ['role:logistica'], children: [
        { path: 'ordem-carregamento', data: ['api:get:/carregamento', 'role:logistica'] },
        { path: 'localidades', data: ['hidden', 'api:post:/locais/search'] },
      ],
    },
    { path: 'cobranca', data: ['api:get:/cobranca/titulos'] },
    { path: 'outra', data: ['api:get:/carregamento'] },
  ];
  const api = (valor: string): ApiDaRota[] => {
    const lida = lerApi(valor);
    return lida ? [lida] : [];
  };
  const carregamento = api('get:/carregamento');
  const cobranca = api('get:/cobranca/titulos');
  const semResposta = api('get:/nao-perguntada');

  let flag: boolean;
  let usuario: string;
  let perfis: string[];
  let backendOnline: boolean;
  let chamadas: { usuario: string; corpo: PermissaoConsulta[] }[];
  let responder: (corpo: PermissaoConsulta[]) => Observable<unknown>;
  let eventos: Subject<unknown>;
  let login: Subject<void>;
  let estadoOffline: BehaviorSubject<{ backendOnline: boolean }>;

  function criar(): PermissoesApiService {
    const minhasPermissoes = {
      consultar: (corpo: PermissaoConsulta[]) => {
        chamadas.push({ usuario, corpo });
        return responder(corpo);
      },
    };
    const config = { isMenuPorPermissao: () => flag };
    const auth = {
      isLoggedIn: () => !!usuario, isCliente: () => false, getRoles: () => perfis, loginChange$: login,
    };
    const offline = {
      get backendOnline() {
        return backendOnline;
      },
      currentOwnerKey: () => (usuario ? `http://back::${usuario}` : null),
      state$: estadoOffline.asObservable(),
    };
    const router = { config: rotas, events: eventos };
    return new PermissoesApiService(minhasPermissoes as any, config as any, auth as any, offline as any, router as any);
  }

  const tudoPermitidoMenos = (negadas: string[]) => (corpo: PermissaoConsulta[]) =>
    of(corpo.map(c => ({ ...c, permitido: !negadas.includes(`${c.metodo} ${c.caminho}`) })));

  const navegar = () => eventos.next(new NavigationEnd(1, '/a', '/a'));

  beforeEach(() => {
    localStorage.removeItem('permissoes_api');
    flag = true;
    usuario = 'u1';
    perfis = ['logistica'];
    backendOnline = true;
    chamadas = [];
    responder = tudoPermitidoMenos(['get /cobranca/titulos']);
    eventos = new Subject();
    login = new Subject();
    estadoOffline = new BehaviorSubject({ backendOnline: true });
  });

  afterEach(() => localStorage.removeItem('permissoes_api'));

  it('com a flag desligada nao busca nada e nao responde', async () => {
    flag = false;
    const service = criar();
    service.iniciar();
    await service.whenReady(100);
    expect(chamadas.length).toBe(0);
    expect(service.permitido(carregamento)).toBeUndefined();
  });

  it('pergunta todas as api das rotas uma vez e responde por elas', async () => {
    const service = criar();
    service.iniciar();
    await service.whenReady(1000);

    expect(chamadas.length).toBe(1);
    expect(chamadas[0].corpo).toEqual([
      { metodo: 'get', caminho: '/carregamento' },
      { metodo: 'get', caminho: '/cobranca/titulos' },
      { metodo: 'post', caminho: '/locais/search' },
    ]);
    expect(service.permitido(carregamento)).toBeTrue();
    expect(service.permitido(cobranca)).toBeFalse();
    expect(service.permitido(semResposta)).toBeUndefined();
    expect(service.permitido([...cobranca, ...carregamento])).toBeTrue();
    expect(service.permitido([...cobranca, ...semResposta])).toBeUndefined();
    expect(service.permitido([])).toBeUndefined();
  });

  it('nao busca de novo antes de 5 minutos, nem a cada navegacao', async () => {
    const service = criar();
    service.iniciar();
    await service.whenReady(1000);
    navegar();
    navegar();
    await service.whenReady(1000);
    expect(chamadas.length).toBe(1);
  });

  it('busca de novo quando a resposta passou de 5 minutos', async () => {
    const service = criar();
    service.iniciar();
    await service.whenReady(1000);
    (service as any).guardado.buscadoEm -= 6 * 60 * 1000;
    navegar();
    await service.whenReady(1000);
    expect(chamadas.length).toBe(2);
  });

  it('perfis novos no token: a resposta antiga deixa de valer na hora e busca de novo', async () => {
    const service = criar();
    service.iniciar();
    await service.whenReady(1000);
    expect(service.permitido(carregamento)).toBeTrue();

    perfis = ['cobranca'];
    responder = () => throwError(() => new Error('fora do ar'));
    expect(service.permitido(carregamento)).toBeUndefined();
    navegar();
    await service.whenReady(1000);
    expect(chamadas.length).toBe(2);
    expect(service.permitido(carregamento)).toBeUndefined();

    perfis = ['logistica'];
    expect(service.permitido(carregamento)).toBeTrue();
  });

  it('resposta e por usuario: outro usuario no mesmo navegador nao herda', async () => {
    const service = criar();
    service.iniciar();
    await service.whenReady(1000);
    expect(service.permitido(carregamento)).toBeTrue();

    usuario = 'u2';
    backendOnline = false;
    expect(service.permitido(carregamento)).toBeUndefined();
  });

  it('o F5 (e o offline) usa a resposta guardada do mesmo usuario', async () => {
    const primeiro = criar();
    primeiro.iniciar();
    await primeiro.whenReady(1000);

    backendOnline = false;
    const depoisDoF5 = criar();
    depoisDoF5.iniciar();
    await depoisDoF5.whenReady(1000);
    expect(chamadas.length).toBe(1);
    expect(depoisDoF5.permitido(carregamento)).toBeTrue();
    expect(depoisDoF5.permitido(cobranca)).toBeFalse();
  });

  it('erro do backend deixa sem resposta e nao tenta de novo a cada navegacao', async () => {
    responder = () => throwError(() => new Error('fora do ar'));
    const service = criar();
    service.iniciar();
    await service.whenReady(1000);
    expect(service.permitido(carregamento)).toBeUndefined();
    navegar();
    await service.whenReady(1000);
    expect(chamadas.length).toBe(1);
  });

  it('resposta fora do formato e tratada como erro', async () => {
    responder = () => of([{ metodo: 'get', caminho: '/carregamento', permitido: true }]);
    const service = criar();
    service.iniciar();
    await service.whenReady(1000);
    expect(service.permitido(carregamento)).toBeUndefined();
  });

  it('troca de usuario com a busca em voo: ja busca a do usuario novo e a resposta antiga nao sobrescreve', fakeAsync(() => {
    const pendente = new Subject<unknown>();
    responder = () => pendente;
    const service = criar();
    service.iniciar();

    usuario = 'u2';
    responder = tudoPermitidoMenos([]);
    login.next();
    flushMicrotasks();
    expect(chamadas.map(c => c.usuario)).toEqual(['u1', 'u2']);
    expect(service.permitido(cobranca)).toBeTrue();

    pendente.next([
      { metodo: 'get', caminho: '/carregamento', permitido: false },
      { metodo: 'get', caminho: '/cobranca/titulos', permitido: false },
      { metodo: 'post', caminho: '/locais/search', permitido: false },
    ]);
    pendente.complete();
    flushMicrotasks();

    expect(chamadas.map(c => c.usuario)).toEqual(['u1', 'u2']);
    expect(service.permitido(cobranca)).toBeTrue();
  }));

  it('erro na busca do usuario anterior tambem dispara a do usuario novo', fakeAsync(() => {
    const pendente = new Subject<unknown>();
    responder = () => pendente;
    const service = criar();
    service.iniciar();

    usuario = 'u2';
    responder = tudoPermitidoMenos([]);
    pendente.error(new Error('fora do ar'));
    flushMicrotasks();

    expect(chamadas.map(c => c.usuario)).toEqual(['u1', 'u2']);
    expect(service.permitido(cobranca)).toBeTrue();
  }));

  it('o guard do usuario novo espera a busca dele, nao so a do anterior', fakeAsync(() => {
    const doAnterior = new Subject<unknown>();
    const doNovo = new Subject<unknown>();
    responder = () => doAnterior;
    const service = criar();
    service.iniciar();

    usuario = 'u2';
    responder = () => doNovo;
    let pronto = false;
    service.whenReady(4000).then(() => (pronto = true));

    doAnterior.error(new Error('fora do ar'));
    flushMicrotasks();
    expect(chamadas.map(c => c.usuario)).toEqual(['u1', 'u2']);
    expect(pronto).toBeFalse();

    tick(1000);
    doNovo.next([
      { metodo: 'get', caminho: '/carregamento', permitido: true },
      { metodo: 'get', caminho: '/cobranca/titulos', permitido: true },
      { metodo: 'post', caminho: '/locais/search', permitido: true },
    ]);
    doNovo.complete();
    flushMicrotasks();
    expect(pronto).toBeTrue();
    expect(service.permitido(cobranca)).toBeTrue();
    tick(4000);
  }));

  it('busca pendurada do usuario anterior nao atrasa a do usuario novo', fakeAsync(() => {
    responder = () => NEVER;
    const service = criar();
    service.iniciar();

    usuario = 'u2';
    responder = tudoPermitidoMenos([]);
    let pronto = false;
    service.whenReady(4000).then(() => (pronto = true));
    flushMicrotasks();

    expect(chamadas.map(c => c.usuario)).toEqual(['u1', 'u2']);
    expect(pronto).toBeTrue();
    expect(service.permitido(cobranca)).toBeTrue();

    tick(15 * 1000);
    flushMicrotasks();
    expect(chamadas.length).toBe(2);
    expect(service.permitido(cobranca)).toBeTrue();
  }));

  it('a busca antiga que termina depois nao fura a espera apos falha da busca nova', fakeAsync(() => {
    const doAnterior = new Subject<unknown>();
    responder = () => doAnterior;
    const service = criar();
    service.iniciar();

    usuario = 'u2';
    responder = () => throwError(() => new Error('fora do ar'));
    login.next();
    flushMicrotasks();
    expect(chamadas.map(c => c.usuario)).toEqual(['u1', 'u2']);

    responder = tudoPermitidoMenos([]);
    doAnterior.next([
      { metodo: 'get', caminho: '/carregamento', permitido: true },
      { metodo: 'get', caminho: '/cobranca/titulos', permitido: true },
      { metodo: 'post', caminho: '/locais/search', permitido: true },
    ]);
    doAnterior.complete();
    flushMicrotasks();
    navegar();
    flushMicrotasks();
    expect(chamadas.length).toBe(2);
    expect(service.permitido(cobranca)).toBeUndefined();

    tick(30 * 1000);
    navegar();
    flushMicrotasks();
    expect(chamadas.map(c => c.usuario)).toEqual(['u1', 'u2', 'u2']);
    expect(service.permitido(cobranca)).toBeTrue();
  }));

  it('u1 -> u2 -> u1: a primeira busca de u1, terminando por ultimo, nao sobrescreve a mais nova', fakeAsync(() => {
    const primeiraDeU1 = new Subject<unknown>();
    responder = () => primeiraDeU1;
    const service = criar();
    service.iniciar();

    usuario = 'u2';
    responder = () => NEVER;
    login.next();
    usuario = 'u1';
    responder = tudoPermitidoMenos(['get /carregamento']);
    login.next();
    flushMicrotasks();
    expect(chamadas.map(c => c.usuario)).toEqual(['u1', 'u2', 'u1']);
    expect(service.permitido(carregamento)).toBeFalse();

    primeiraDeU1.next([
      { metodo: 'get', caminho: '/carregamento', permitido: true },
      { metodo: 'get', caminho: '/cobranca/titulos', permitido: true },
      { metodo: 'post', caminho: '/locais/search', permitido: true },
    ]);
    primeiraDeU1.complete();
    flushMicrotasks();
    expect(service.permitido(carregamento)).toBeFalse();
    tick(15 * 1000);
  }));

  it('o guard nao espera alem do prazo mesmo encadeando buscas', fakeAsync(() => {
    const doAnterior = new Subject<unknown>();
    responder = () => doAnterior;
    const service = criar();
    service.iniciar();

    usuario = 'u2';
    responder = () => NEVER;
    let pronto = false;
    service.whenReady(4000).then(() => (pronto = true));
    doAnterior.error(new Error('fora do ar'));
    flushMicrotasks();
    tick(3999);
    expect(pronto).toBeFalse();
    tick(1);
    flushMicrotasks();
    expect(pronto).toBeTrue();
    expect(service.permitido(cobranca)).toBeUndefined();
    tick(15 * 1000);
  }));

  it('subiu sem backend e ele voltou: busca na volta, sem login nem navegacao', fakeAsync(() => {
    backendOnline = false;
    estadoOffline.next({ backendOnline: false });
    const service = criar();
    service.iniciar();
    flushMicrotasks();
    expect(chamadas.length).toBe(0);

    backendOnline = true;
    estadoOffline.next({ backendOnline: true });
    flushMicrotasks();
    expect(chamadas.length).toBe(1);
    expect(service.permitido(carregamento)).toBeTrue();
  }));

  it('logout descarta a resposta guardada e o proximo login comeca sem ela', fakeAsync(() => {
    const service = criar();
    service.iniciar();
    flushMicrotasks();
    expect(service.permitido(carregamento)).toBeTrue();
    expect(localStorage.getItem('permissoes_api')).not.toBeNull();

    usuario = '';
    login.next();
    flushMicrotasks();
    expect(localStorage.getItem('permissoes_api')).toBeNull();

    usuario = 'u1';
    responder = tudoPermitidoMenos(['get /carregamento']);
    expect(service.permitido(carregamento)).toBeUndefined();
    login.next();
    flushMicrotasks();
    expect(chamadas.length).toBe(2);
    expect(service.permitido(carregamento)).toBeFalse();
  }));

  it('novo login do mesmo usuario dentro dos 5 minutos busca de novo em vez de reusar a resposta', fakeAsync(() => {
    const service = criar();
    service.iniciar();
    flushMicrotasks();
    expect(service.permitido(cobranca)).toBeFalse();

    responder = tudoPermitidoMenos([]);
    login.next();
    flushMicrotasks();
    expect(chamadas.length).toBe(2);
    expect(service.permitido(cobranca)).toBeTrue();
  }));

  it('login enquanto a busca da sessao anterior ainda esta pendente: nao espera por ela', fakeAsync(() => {
    const antiga = new Subject<unknown>();
    responder = () => antiga;
    const service = criar();
    service.iniciar();

    responder = tudoPermitidoMenos([]);
    login.next();
    flushMicrotasks();
    expect(chamadas.length).toBe(2);
    expect(service.permitido(cobranca)).toBeTrue();

    antiga.next([
      { metodo: 'get', caminho: '/carregamento', permitido: false },
      { metodo: 'get', caminho: '/cobranca/titulos', permitido: false },
      { metodo: 'post', caminho: '/locais/search', permitido: false },
    ]);
    antiga.complete();
    flushMicrotasks();
    expect(service.permitido(cobranca)).toBeTrue();
    expect(chamadas.length).toBe(2);
  }));

  it('chamada pendurada expira e libera as buscas seguintes', fakeAsync(() => {
    responder = () => NEVER;
    const service = criar();
    service.iniciar();
    tick(15 * 1000);
    flushMicrotasks();
    expect(service.permitido(carregamento)).toBeUndefined();

    responder = tudoPermitidoMenos([]);
    tick(30 * 1000);
    navegar();
    flushMicrotasks();
    expect(chamadas.length).toBe(2);
    expect(service.permitido(carregamento)).toBeTrue();
  }));

  it('avisa o menu so quando a resposta muda', async () => {
    const service = criar();
    let avisos = 0;
    service.changes$.subscribe(() => avisos++);
    service.iniciar();
    await service.whenReady(1000);
    expect(avisos).toBe(1);

    (service as any).guardado.buscadoEm = 0;
    navegar();
    await service.whenReady(1000);
    expect(chamadas.length).toBe(2);
    expect(avisos).toBe(1);
  });

  it('whenReady nao espera mais que o limite', async () => {
    responder = () => NEVER;
    const service = criar();
    service.iniciar();
    const inicio = Date.now();
    await service.whenReady(50);
    expect(Date.now() - inicio).toBeLessThan(1000);
    expect(service.permitido(carregamento)).toBeUndefined();
  });

  it('sem login nao pergunta', async () => {
    usuario = '';
    const service = criar();
    service.iniciar();
    await service.whenReady(100);
    expect(chamadas.length).toBe(0);
  });
});
