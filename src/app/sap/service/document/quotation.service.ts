import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { DocumentAngularSave } from './document-angular-save';
import { PedidoVenda } from '../../components/document/documento.statement.component';

@Injectable({
  providedIn: 'root'
})
export class QuotationService implements DocumentAngularSave {

  url = "http://localhost:8080/quotation"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
      this.url = config.getHost()+"/quotation"
  }

  save(body : PedidoVenda) : Observable<any>{
    return this.hppCliente.post<any>(this.url+"/angular",body)
  }
}
