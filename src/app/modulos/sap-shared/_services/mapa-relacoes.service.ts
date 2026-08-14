import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { MapaRelacoesResponse } from '../../../sap/model/mapa-relacoes';

@Injectable({
  providedIn: 'root'
})
export class MapaRelacoesService {

  url = "http://localhost:8080/mapa-relacoes"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/mapa-relacoes"
  }

  buscar(tipo : string, docEntry : number) : Observable<MapaRelacoesResponse>{
    return this.hppCliente.get<MapaRelacoesResponse>(this.url+"/"+tipo+"/"+docEntry)
  }
}
