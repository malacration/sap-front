import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
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
        if(error.status != 200 && error.error){
          console.log(error)
          if(error.error instanceof Blob) {
            error.error.text().then(text => {
              if(JSON.parse(text).mensagem)
                this.alertService.error(JSON.parse(text).mensagem);
            })
          }
          
          let msg = undefined;
          if(error.error.mensagem)
            msg = error.error.mensagem;
            
          if(error.error.mensagem == undefined || error.error.mensagem == null)
            msg = error.message;
          this. alertService.error(msg);
          return throwError(error);
        }
      })
    );
  }
}