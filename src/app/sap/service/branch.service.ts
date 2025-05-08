import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { Branch } from '../model/branch';

@Injectable({
  providedIn: 'root'
})
export class BranchService {

  url = "http://localhost:8080/branch"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/branch"
  }

  get() : Observable<Array<Branch>>{
    return this.hppCliente.get<Array<Branch>>(this.url)
  }

  getSearchBranch() : Observable<Array<Branch>>{
    return this.hppCliente.get<Array<Branch>>(this.url + "/search-branch")
  }
}
