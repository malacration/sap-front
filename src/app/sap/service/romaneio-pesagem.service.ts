import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RomaneioPesagem } from '../model/romaneio-pesagem.model';

@Injectable({
  providedIn: 'root'
})
export class RomaneioPesagemService {

  url = "http://10.200.30.106:8080/romaneio-pesagem"

  constructor(private hppCliente : HttpClient) { 
    
  }

  get() : Observable<Array<RomaneioPesagem>>{
    return this.hppCliente.get<Array<RomaneioPesagem>>(this.url+"/contrato-fazenda")
  }

  getByid(id : string) : Observable<Array<RomaneioPesagem>>{
    return this.hppCliente.get<Array<RomaneioPesagem>>(this.url+'/'+id)
  }
}
