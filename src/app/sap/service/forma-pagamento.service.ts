import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { Page } from '../model/page.model';
import { Item } from '../model/item';

@Injectable({
  providedIn: 'root'
})
export class FormaPagamentoService{

  url = "http://localhost:8080/forma-pagamento"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/forma-pagamento"
  }

  getCondicoes(idFilial : number) : Observable<Array<FormaPagamento>>{
    return this.hppCliente.get<Array<FormaPagamento>>(this.url+"/"+idFilial)
  }
}


export class FormaPagamento{
  payMethCod: number
  Description: string
  branch: number
  BPLID: number
}