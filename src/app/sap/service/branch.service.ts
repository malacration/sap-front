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
      .pipe(map(it => (it || []).map(branch => this.normaliza(branch))))
  }

  private normaliza(branch : any) : Branch {
    const normalizado = Object.assign(new Branch(), branch)
    normalizado.Bplid = branch?.Bplid ?? branch?.BPLID
    normalizado.Bplname = branch?.Bplname ?? branch?.BPLName
    normalizado.BPLID = branch?.BPLID ?? branch?.Bplid
    normalizado.BPLName = branch?.BPLName ?? branch?.Bplname
    return normalizado
  }
}
