import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { UsuarioAtual } from '../../../sap/model/usuario-atual';

@Injectable({
  providedIn: 'root'
})
export class UsuarioAtualService {

  url = "http://localhost:8080/me"

  constructor(private config : ConfigService, private httpCliente : HttpClient) {
    this.url = config.getHost()+"/me"
  }

  get() : Observable<UsuarioAtual>{
    return this.httpCliente
      .get<UsuarioAtual>(this.url)
      .pipe(map(it => Object.assign(new UsuarioAtual(), it)))
  }
}
