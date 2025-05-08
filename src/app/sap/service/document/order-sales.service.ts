import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { PedidoVenda } from '../../components/document/documento.statement.component';
import { NextLink } from '../../model/next-link';

@Injectable({
  providedIn: 'root'
})
export class OrderSalesService {
  url = "http://localhost:8080/pedido-venda";

  constructor(private config: ConfigService, private httpClient: HttpClient) {
    this.url = config.getHost() + "/pedido-venda";
  }

  save(body: PedidoVenda): Observable<any> {
    return this.httpClient.post<any>(`${this.url}/angular`, body);
  }
}