import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { State } from '../../model/adressess/state';
import { ConfigService } from '../../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class StateService {

  url = "http://localhost:8080/state"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) { 
      this.url = config.getHost+"/state"
  }

  get() : Observable<Array<State>>{
    return this.hppCliente.get<Array<State>>(this.url)
  }
}
