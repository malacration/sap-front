import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RomaneioPesagem } from '../model/romaneio-pesagem.model';
import { Page } from '../model/page.model';

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

  get(page) : Observable<Page<RomaneioPesagem>>{
    return this.hppCliente.get<Page<RomaneioPesagem>>(this.url+"/contrato-fazenda?page="+page)
  }

  getByid(id : string) : Observable<Array<RomaneioPesagem>>{
    return this.hppCliente.get<Array<RomaneioPesagem>>(this.url+'/'+id)
  }
}
