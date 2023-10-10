import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { City } from '../../model/adressess/city';

@Injectable({
  providedIn: 'root'
})
export class CityService {

  url = "http://localhost:8080/city"
  
  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/state"
  }

  get(estado : string) : Observable<Array<City>>{
    return this.hppCliente.get<Array<City>>(this.url+"/"+estado)
  }
}
