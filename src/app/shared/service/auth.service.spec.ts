import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '../../core/services/config.service';

/** Monta um JWT falso: só o payload importa, a assinatura nunca é validada no front. */
function fakeToken(payload: any): string {
  return `header.${window.btoa(JSON.stringify(payload))}.signature`;
}

describe('AuthService — roles do token', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        AuthService,
        { provide: ConfigService, useValue: { getHost: () => 'http://localhost:8080' } },
      ],
    });
    service = TestBed.inject(AuthService);
    localStorage.removeItem('token');
  });

  afterEach(() => localStorage.removeItem('token'));

  it('lê realm_access e resource_access do token do Keycloak', () => {
    localStorage.setItem('token', fakeToken({
      realm_access: { roles: ['pix', 'vendedor'] },
      resource_access: { 'front-sap': { roles: ['pix_admin'] } },
    }));

    expect(service.getRoles()).toContain('pix');
    expect(service.getRoles()).toContain('vendedor');
    expect(service.getRoles()).toContain('pix_admin');
    expect(service.podePixSemJuros).toBeTrue();
  });

  it('lê authorities do token interno', () => {
    localStorage.setItem('token', fakeToken({
      authorities: [{ authority: 'pix' }, { authority: 'cobranca' }],
    }));

    expect(service.getRoles()).toEqual(['pix', 'cobranca']);
    expect(service.hasRole('pix')).toBeTrue();
  });

  it('role pix nao autoriza pix sem juros', () => {
    localStorage.setItem('token', fakeToken({ realm_access: { roles: ['pix'] } }));

    expect(service.podePixSemJuros).toBeFalse();
  });

  it('admin nao autoriza pix sem juros — espelha o isAllCreatePix do backend', () => {
    localStorage.setItem('token', fakeToken({ realm_access: { roles: ['admin'] } }));

    expect(service.podePixSemJuros).toBeFalse();
  });

  it('sem token nao explode e nao autoriza nada', () => {
    expect(service.getRoles()).toEqual([]);
    expect(service.podePixSemJuros).toBeFalse();
  });

  it('token malformado nao explode', () => {
    localStorage.setItem('token', 'nao-e-um-jwt');

    expect(service.getRoles()).toEqual([]);
  });
});
