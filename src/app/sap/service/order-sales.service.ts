import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OrderSales } from '../components/document/documento.statement.component';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class OrderSalesService {

  url = "http://localhost:8080/quotation"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
      this.url = config.getHost()+"/quotation"
  }

  save(body : OrderSales) : Observable<any>{
    return this.hppCliente.post<any>(this.url+"/angular",body)
  }
}
