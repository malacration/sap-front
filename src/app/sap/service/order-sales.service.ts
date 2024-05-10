import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { OrderSales } from '../components/document/documento.statement.component';

@Injectable({
  providedIn: 'root'
})
export class OrderSalesService {

  url = "http://localhost:8080/quotation"
  
  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/quotation"
  }

  save(body : OrderSales) : Observable<any>{
    return this.hppCliente.post<any>(this.url+"/angular",body)
  }
}
