import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Autorizador } from '../../../sap/model/autorizador';

@Injectable({
  providedIn: 'root'
})
export class AutorizadorService {

  url = "http://localhost:8080/autorizador"

  constructor(private config : ConfigService, private httpCliente : HttpClient) {
    this.url = config.getHost()+"/autorizador"
  }

  private toAutorizador(it : any) : Autorizador {
    return Object.assign(new Autorizador(), it)
  }

  getTodos() : Observable<Array<Autorizador>>{
    return this.httpCliente
      .get<Array<Autorizador>>(this.url)
      .pipe(map(it => (it || []).map(a => this.toAutorizador(a))))
  }

  criar(autorizador : Partial<Autorizador>) : Observable<Autorizador>{
    return this.httpCliente
      .post<Autorizador>(this.url, autorizador)
      .pipe(map(it => this.toAutorizador(it)))
  }

  remover(code : number) : Observable<any>{
    return this.httpCliente.delete(this.url+"/"+code)
  }
}
