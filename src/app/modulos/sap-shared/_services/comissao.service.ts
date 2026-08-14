import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Comissao } from '../../../sap/model/comissao';

@Injectable({
  providedIn: 'root'
})
export class ComissaoService {

  url = "http://localhost:8080/comissao"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/comissao"
  }

  private toComissao(it : any) : Comissao {
    return Object.assign(new Comissao(), it)
  }

  getTodas() : Observable<Array<Comissao>>{
    return this.hppCliente
      .get<Array<Comissao>>(this.url)
      .pipe(map(it => (it || []).map(c => this.toComissao(c))))
  }

  get(code : number) : Observable<Comissao>{
    return this.hppCliente
      .get<Comissao>(this.url+"/"+code)
      .pipe(map(it => this.toComissao(it)))
  }

  //comissao vinculada a uma tabela de preco (OPLN.U_tipoComissao) - usado na tela de
  //Vender pra saber o desconto maximo permitido e a comissao calculada por item
  getByIdTabela(tabela : number) : Observable<Comissao>{
    return this.hppCliente
      .get<Comissao>(this.url+"/tabela/"+tabela)
      .pipe(map(it => this.toComissao(it)))
  }

  criar(comissao : Partial<Comissao>) : Observable<Comissao>{
    return this.hppCliente
      .post<Comissao>(this.url, comissao)
      .pipe(map(it => this.toComissao(it)))
  }

  atualizar(code : number, comissao : Partial<Comissao>) : Observable<Comissao>{
    return this.hppCliente
      .patch<Comissao>(this.url+"/"+code, comissao)
      .pipe(map(it => this.toComissao(it)))
  }
}
