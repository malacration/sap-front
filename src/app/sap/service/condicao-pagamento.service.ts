import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RomaneioFazendaInsumo } from '../model/romaneio-fazenda-insumo.model';
import { BusinessPlace } from '../model/business-place';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class CondicaoPagamentoService {

  url = "http://localhost:8080/prazo"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
      this.url = config.getHost()+"/prazo"
  }

  getByTabela(tabela : number) : Observable<Array<CondicaoPagamento>>{
    return this.hppCliente.get<Array<CondicaoPagamento>>(this.url+"/tabela/"+tabela)
  }
}


export class CondicaoPagamento{
  GroupNum : string
  PymntGroup
  ListNum : string
  Code : string
  U_desconto : number
  U_juros : number
}