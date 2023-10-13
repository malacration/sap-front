import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertSerice } from './sap/service/alert.service';


@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private alertService : AlertSerice) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log(error)
        let msg = error.error.mensagem;
        if(error.error.mensagem == undefined || error.error.mensagem == null)
          msg = error.message;
        this. alertService.error(msg);
        return throwError(error);
      })
    );
  }
}