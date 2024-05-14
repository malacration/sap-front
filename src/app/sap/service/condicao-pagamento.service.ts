import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RomaneioFazendaInsumo } from '../model/romaneio-fazenda-insumo.model';
import { BusinessPlace } from '../model/business-place';

@Injectable({
  providedIn: 'root'
})
export class CondicaoPagamentoService {

  url = "http://localhost:8080/prazo"
  
  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/prazo"
  }

  getByTabela(tabela : number) : Observable<Array<CondicaoPagamento>>{
    return this.hppCliente.get<Array<CondicaoPagamento>>(this.url+"/tabela/"+tabela)
  }
}


export class CondicaoPagamento{
  groupNum : string
  pymntGroup
  listNum : string
  code : string
}