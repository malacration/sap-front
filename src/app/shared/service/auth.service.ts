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