import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class BranchService {

  url = "http://localhost:8080/branch"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/branch"
  }

  get() : Observable<Array<any>>{
    return this.hppCliente.get<Array<any>>(this.url)
  }
}
