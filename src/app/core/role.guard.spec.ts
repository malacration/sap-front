import { EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../shared/service/auth.service';
import { OfflineContextService } from './offline/offline-context.service';
import { PermissoesApiService } from './permissoes-api.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let papeis: string[];
  let ativo: boolean;
  let resposta: boolean | undefined;
  let esperas: number;

  beforeEach(() => {
    papeis = ['logistica'];
    ativo = true;
    resposta = undefined;
    esperas = 0;
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: { getRoles: () => papeis } },
        { provide: OfflineContextService, useValue: { canEnterOfflineRoutes: false, snapshot: {} } },
        {
          provide: PermissoesApiService, useValue: {
            get ativo() { return ativo; },
            whenReady: () => { esperas++; return Promise.resolve(); },
            permitido: () => resposta,
          },
        },
      ],
    });
  });

  function rodar(data: string[]): Promise<boolean | UrlTree> {
    const snapshot = { routeConfig: { data }, data: { ...data } } as unknown as ActivatedRouteSnapshot;
    return TestBed.inject(EnvironmentInjector)
      .runInContext(() => roleGuard(snapshot, {} as RouterStateSnapshot)) as Promise<boolean | UrlTree>;
  }

  const home = (r: boolean | UrlTree) => r instanceof UrlTree && r.toString() === '/home';

  it('a resposta do backend decide quando existe, mesmo contra o role', async () => {
    resposta = true;
    expect(await rodar(['api:get:/cobranca/titulos', 'role:cobranca'])).toBeTrue();
    resposta = false;
    expect(home(await rodar(['api:get:/carregamento', 'role:logistica']))).toBeTrue();
    expect(esperas).toBe(2);
  });

  it('sem resposta cai no role', async () => {
    resposta = undefined;
    expect(await rodar(['api:get:/carregamento', 'role:logistica'])).toBeTrue();
    expect(home(await rodar(['api:get:/cobranca/titulos', 'role:cobranca']))).toBeTrue();
  });

  it('flag desligada: so o role, sem esperar a resposta', async () => {
    ativo = false;
    resposta = false;
    expect(await rodar(['api:get:/carregamento', 'role:logistica'])).toBeTrue();
    expect(await rodar(['api:get:/carregamento'])).toBeTrue();
    expect(esperas).toBe(0);
  });

  it('role-not vale sempre, ate com a api liberada', async () => {
    papeis = ['business_partner'];
    resposta = true;
    expect(home(await rodar(['role-not:business_partner', 'api:get:/x']))).toBeTrue();
  });

  it('admin passa pelo role quando nao ha resposta', async () => {
    papeis = ['admin'];
    expect(await rodar(['api:get:/x', 'role:cobranca'])).toBeTrue();
  });
});
