import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, firstValueFrom, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertSerice } from '../sap/service/alert.service';


@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private alertService : AlertSerice) {}

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
        if (error.status === 403) {
          this.alertService.error('Acesso negado');
        } else if (error.status != 200 && error.error) {
          this.getMsgError(error).then(it => this.alertService.error(it));
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