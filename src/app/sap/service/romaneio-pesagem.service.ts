import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RomaneioPesagem } from '../model/romaneio-pesagem.model';
import { Page } from '../model/page.model';
import { Filter } from '../model/filter.model';

@Injectable({
  providedIn: 'root'
})
export class RomaneioPesagemService {

  url = "http://localhost:8080/romaneio-pesagem"

  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/romaneio-pesagem" 
  }

  // get(page, filters : Map<string,Filter> = new Map()) : Observable<Page<RomaneioPesagem>>{
  //   let strFiltger = (filters.size > 0 ? "&"  : "") + Array.from(filters.values()).map(it => it.getUrlFilter()).join('&')
  //   return this.hppCliente.get<Page<RomaneioPesagem>>(this.url+"/contrato-fazenda?page="+page+strFiltger)
  // }

  // getSaida(page, filters : Map<string,Filter> = new Map()) : Observable<Page<RomaneioPesagem>>{
  //   let strFiltger = (filters.size > 0 ? "&"  : "") + Array.from(filters.values()).map(it => it.getUrlFilter()).join('&')
  //   return this.hppCliente.get<Page<RomaneioPesagem>>(this.url+"/contrato-fazenda?page="+page+strFiltger)
  // }

  get(page, filters: Map<string, Filter> = new Map(), contratoFazenda: string = 'ENTRADA'): Observable<Page<RomaneioPesagem>> {
    let strFiltger = (filters.size > 0 ? "&" : "") + Array.from(filters.values()).map(it => it.getUrlFilter()).join('&');
    let contratoFazendaParam = "&contratofazenda=" + contratoFazenda; // Sempre inclui o parâmetro "tipo"
    return this.hppCliente.get<Page<RomaneioPesagem>>(this.url + "/contrato-fazenda?page=" + page + strFiltger + contratoFazendaParam);
  }

  getSaida(page, filters: Map<string, Filter> = new Map(), contratoFazenda: string = 'SAIDA'): Observable<Page<RomaneioPesagem>> {
    let strFiltger = (filters.size > 0 ? "&" : "") + Array.from(filters.values()).map(it => it.getUrlFilter()).join('&');
    let contratoFazendaParam = "&contratofazenda=" + contratoFazenda; // Sempre inclui o parâmetro "tipo"
    return this.hppCliente.get<Page<RomaneioPesagem>>(this.url + "/contrato-fazenda?page=" + page + strFiltger + contratoFazendaParam);
  }
  
  
  

  getByid(id : string) : Observable<Array<RomaneioPesagem>>{
    return this.hppCliente.get<Array<RomaneioPesagem>>(this.url+'/'+id)
  }
}


