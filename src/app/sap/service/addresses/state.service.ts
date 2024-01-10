import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { State } from '../../model/adressess/state';
import { ConfigService } from '../../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class StateService implements OnInit {

  url = "http://localhost:8080/state"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) { 
      
  }

  ngOnInit(){
    this.url = this.config.getHost()+"/state"
  }

  get() : Observable<Array<State>>{
    return this.hppCliente.get<Array<State>>(this.url)
  }
}
