import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { RegraFilial } from '../../../sap/model/regra-filial';

@Injectable({
  providedIn: 'root'
})
export class RegraFilialService {

  url = "http://localhost:8080/regra-filial"

  constructor(private config : ConfigService, private httpCliente : HttpClient) {
    this.url = config.getHost()+"/regra-filial"
  }

  private toRegraFilial(it : any) : RegraFilial {
    return Object.assign(new RegraFilial(), it)
  }

  getTodos() : Observable<Array<RegraFilial>>{
    return this.httpCliente
      .get<Array<RegraFilial>>(this.url)
      .pipe(map(it => (it || []).map(r => this.toRegraFilial(r))))
  }

  criar(regraFilial : Partial<RegraFilial>) : Observable<RegraFilial>{
    return this.httpCliente
      .post<RegraFilial>(this.url, regraFilial)
      .pipe(map(it => this.toRegraFilial(it)))
  }

  remover(code : string) : Observable<any>{
    return this.httpCliente.delete(this.url+"/"+code)
  }
}
