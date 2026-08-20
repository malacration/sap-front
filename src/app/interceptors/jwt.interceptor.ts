import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { ensureFreshToken } from '../core/keycloak';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  /**
   * Anexa o access token no header Authorization.
   *
   * Em modo Keycloak o token e renovado antes de sair, se estiver perto de
   * expirar — nao basta confiar no timer interno do keycloak-js, que atrasa
   * com a aba em background ou a maquina suspensa.
   */
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return from(ensureFreshToken()).pipe(
      switchMap(userToken => {
        if (!userToken) {
          return next.handle(req);
        }
        const modifiedReq = req.clone({
          headers: req.headers.set('Authorization', userToken),
        });
        return next.handle(modifiedReq);
      })
    );
  }
}
