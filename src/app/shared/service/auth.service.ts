import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

class UserPassword{
  username: string
  password: string
  constructor(username,password){
    this.username = username
    this.password = password
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080';
  private tokenKey = 'token';

  constructor(
    private http: HttpClient, 
    private router: Router,
    private config : ConfigService) { 
        this.apiUrl = config.getHost()
        
    }

  private loginChange = new Subject<void>()
  loginChange$ = this.loginChange.asObservable();

  /** Modo de autenticacao informado pelo backend via /auth/config. */
  getAuthMode(): 'internal' | 'keycloak' {
    return (window as any)['auth-config']?.mode ?? 'internal'
  }

  isKeycloak(): boolean {
    return this.getAuthMode() === 'keycloak'
  }

  login(username: string, password: string): Observable<boolean> {
    return this.http.post<Token>(`${this.apiUrl}/logar`,new UserPassword(username,password))
      .pipe(map((response) => this.setToken(response)))
  }

  /** Inicia o fluxo OIDC do Keycloak (redirect para a tela de login do KC). */
  loginKeycloak(returnUrl: string = '/home'): void {
    const keycloak = (window as any).keycloak
    if (!keycloak) {
      console.error('Keycloak nao inicializado')
      return
    }
    const target = returnUrl && returnUrl !== '/login' && returnUrl !== '/' ? returnUrl : '/home'
    keycloak.login({ redirectUri: window.location.origin + target })
  }

  changePassword(password : String){
    return this.http.post<Token>(`${this.apiUrl}/change-password`,password)
  }

  getDecodeToken() {
    return JSON.parse(window.atob(this.getToken().split('.')[1]));
  }

  /**
   * Roles do usuario lidas do proprio token, cobrindo os dois modos de autenticacao:
   *  - Keycloak: `realm_access.roles` + `resource_access[client].roles` (mesmas claims que o
   *    KeycloakUserMapper le no backend);
   *  - token interno: claim `authorities` no formato `[{ authority: 'pix' }, ...]`.
   */
  getRoles(): string[] {
    try {
      const token = this.getDecodeToken()
      const realm = token?.realm_access?.roles ?? []
      const client = Object.values(token?.resource_access ?? {})
        .flatMap((it: any) => it?.roles ?? [])
      const interno = (token?.authorities ?? [])
        .map((it: any) => it?.authority)
        .filter((it: any) => !!it)
      return [...realm, ...client, ...interno]
    } catch {
      return []
    }
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role)
  }

  /**
   * Espelha `User.isAllCreatePix` do backend: apenas `pix_admin` pode gerar PIX sem juros.
   * Nao inclui `admin` de proposito — o backend tambem nao inclui, e um front mais permissivo
   * que o backend faria o usuario ver o botao e levar erro ao clicar.
   */
  get podePixSemJuros(): boolean {
    return this.hasRole('pix_admin')
  }

  /** Verdadeiro se o token atual foi emitido pelo Keycloak. */
  private isKeycloakToken(): boolean {
    try {
      return !!this.getDecodeToken().iss
    } catch {
      return false
    }
  }

  logout(): void {
    if (this.isKeycloak()) {
      this.removeToken();
      localStorage.removeItem('kc_refresh_token');
      this.loginChange.next();
      const keycloak = (window as any).keycloak
      keycloak?.logout({ redirectUri: window.location.origin })
      return
    }
    this.removeToken();
    this.loginChange.next();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUser() : string {
    const token = this.getDecodeToken()
    return token.name ?? token.preferred_username ?? token.sub
  }

  getId() : string {
    const token = this.getDecodeToken()
    return token.jti ?? token.sub
  }

  isCliente() : boolean {
    try {
      // Cliente externo = sessao via OTP (token interno, sem issuer Keycloak).
      if (this.isKeycloakToken())
        return false
      return this.isLoggedIn() && this.getId().length > 6
    } catch {
      return false
    }
  }

  private setToken(token: Token): boolean {
    localStorage.setItem(this.tokenKey, token.token);
    this.loginChange.next();
    return true
  }

  private getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private removeToken(): void {
    localStorage.removeItem(this.tokenKey);
  }
}

class Token{
  token : string
}