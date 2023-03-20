import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RomaneioEntradaInsumo } from '../model/romaneio-entrada-insumo.model';

@Injectable({
  providedIn: 'root'
})
export class RomaneioEntradaInsumoService {

  url = "http://10.200.30.106:8080/romaneio-entrada-insumo"
  
  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/romaneio-entrada-insumo"
  }

  draft(idRomaneioPesagem : string) : Observable<RomaneioEntradaInsumo>{
    return this.hppCliente.get<RomaneioEntradaInsumo>(this.url+'/draft/'+idRomaneioPesagem)
  }

  save(idRomaneioPesagem : string) : Observable<any>{
    return this.hppCliente.get(this.url+'/salvar/'+idRomaneioPesagem)
  }
}
