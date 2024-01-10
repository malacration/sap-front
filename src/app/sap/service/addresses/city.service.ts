import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { City } from '../../model/adressess/city';
import { ConfigService } from '../../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class CityService {

  url = "http://localhost:8080/city"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) { 
      this.url = config.getHost()+"/city"
  }

  ngOnInit(){
    this.url = this.config.getHost()+"/city"
  }

  get(estado : string) : Observable<Array<City>>{
    return this.hppCliente.get<Array<City>>(this.url+"/"+estado)
  }
}
