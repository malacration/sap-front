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


  login(username: string, password: string): Observable<boolean> {
    return this.http.post<Token>(`${this.apiUrl}/logar`,new UserPassword(username,password))
      .pipe(map((response) => this.setToken(response))) 
  }

  changePassword(password : String){
    return this.http.post<Token>(`${this.apiUrl}/change-password`,password)
  }

  getDecodeToken() {
    return JSON.parse(window.atob(this.getToken().split('.')[1]));
  }

  logout(): void {
    this.removeToken();
    this.loginChange.next();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUser() : string {
    return this.getDecodeToken().sub
  }

  getId() : string {
    return this.getDecodeToken().jti
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