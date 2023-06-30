import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RomaneioEntradaInsumo } from '../model/romaneio-entrada-insumo.model';
import { BusinessPlace } from '../model/business-place';

@Injectable({
  providedIn: 'root'
})
export class BusinessPlacesService {

  url = "http://localhost:8080/place"
  
  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/place"
  }

  get() : Observable<Array<BusinessPlace>>{
    return this.hppCliente.get<Array<BusinessPlace>>(this.url)
  }
}
