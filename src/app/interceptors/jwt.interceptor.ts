import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ConfigService } from '../core/services/config.service';


@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private config : ConfigService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    let userToken = localStorage.getItem("token")
    if(userToken){
      const modifiedReq = req.clone({ 
        headers: req.headers.set('Authorization', userToken),
      });
      return next.handle(modifiedReq);
    }else{
      return next.handle(req);
    }
  }
}