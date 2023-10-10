import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { State } from '../../model/adressess/state';

@Injectable({
  providedIn: 'root'
})
export class StateService {

  url = "http://localhost:8080/state"
  
  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/state"
  }

  get() : Observable<Array<State>>{
    return this.hppCliente.get<Array<State>>(this.url)
  }
}
