import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, firstValueFrom, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AlertService } from '../shared/service/alert.service';
import { clearTokens, isKeycloakSession } from '../core/keycloak';


@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private alertService : AlertService, private router : Router) {}

  blobToString(b) {
    var u, x;
    u = URL.createObjectURL(b);
    x = new XMLHttpRequest();
    x.open('GET', u, false); // although sync, you're not fetching over internet
    x.send();
    URL.revokeObjectURL(u);
    return x.responseText;
  }


  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Sessao do SSO acabou (refresh token expirado/revogado): sem token
        // valido nao ha o que renovar, entao devolve o usuario ao login — que
        // em modo Keycloak redireciona sozinho para a tela do KC.
        if (error.status === 401 && isKeycloakSession()) {
          clearTokens();
          this.router.navigate(['/login']);
          return throwError(error);
        }
        if (error.status === 403) {
          const msg = (typeof error.error === 'string' && error.error.trim())
            ? error.error
            : 'Acesso negado';
          this.alertService.error(msg);
        } else if (error.status != 200 && error.error) {
          let titulo = "Erro"
          if(error.error.traceId)
            titulo = "Erro - "+error.error.traceId

          this.getMsgError(error).then(
            it => this.alertService.error(it,titulo)
          );
        }
        return throwError(error);
      })
    );
  }

  getMsgError(error: HttpErrorResponse) : Promise<string>{    
    if(typeof error.error === 'string')
      return firstValueFrom(of(error.error.toString()))
    if(error.error instanceof Blob)
      return error.error.text()
    if(error.error.mensagem && typeof error.error.mensagem === 'string')
      return firstValueFrom(of(error.error.mensagem))
    if(error.error.mensagem)
      return firstValueFrom(of(error.error.mensagem))
    if(error.message)
      return firstValueFrom(of(error.message))

  }
}