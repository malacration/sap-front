import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RomaneioFazendaInsumo } from '../model/romaneio-fazenda-insumo.model';

@Injectable({
  providedIn: 'root'
})
export class RomaneioFazendaInsumoService {

  url = "http://localhost:8080/romaneio-fazenda-insumo"
  
  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/romaneio-fazenda-insumo"
  }

  draft(idRomaneioPesagem : string) : Observable<RomaneioFazendaInsumo>{
    return this.hppCliente.get<RomaneioFazendaInsumo>(this.url+'/draft/'+idRomaneioPesagem)
  }

  save(idRomaneioPesagem : string, tipo : string) : Observable<any>{
    return this.hppCliente.get(this.url+`/salvar/${tipo}/`+idRomaneioPesagem)
  }

  
}
