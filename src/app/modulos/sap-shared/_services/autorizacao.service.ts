import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Autorizacao } from '../../../sap/model/autorizacao';

@Injectable({
  providedIn: 'root'
})
export class AutorizacaoService {

  url = "http://localhost:8080/autorizacao"

  constructor(private config : ConfigService, private httpCliente : HttpClient) {
    this.url = config.getHost()+"/autorizacao"
  }

  private toAutorizacao(it : any) : Autorizacao {
    return Object.assign(new Autorizacao(), it)
  }

  //fila do usuario logado - so o que ele pode decidir (roteamento por motivo em @AUTORIZADOR)
  getPendentes() : Observable<Array<Autorizacao>>{
    return this.httpCliente
      .get<Array<Autorizacao>>(this.url+"/pendentes")
      .pipe(map(it => (it || []).map(a => this.toAutorizacao(a))))
  }

  //historico completo, pra auditoria
  getTodas() : Observable<Array<Autorizacao>>{
    return this.httpCliente
      .get<Array<Autorizacao>>(this.url)
      .pipe(map(it => (it || []).map(a => this.toAutorizacao(a))))
  }

  aprovar(id : number) : Observable<Autorizacao>{
    return this.httpCliente
      .post<Autorizacao>(this.url+"/"+id+"/aprovar", null)
      .pipe(map(it => this.toAutorizacao(it)))
  }

  rejeitar(id : number, observacao : string) : Observable<Autorizacao>{
    return this.httpCliente
      .post<Autorizacao>(this.url+"/"+id+"/rejeitar", observacao)
      .pipe(map(it => this.toAutorizacao(it)))
  }
}
