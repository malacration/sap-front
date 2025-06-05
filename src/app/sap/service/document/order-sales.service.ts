import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { DocumentAngularSave } from './document-angular-save';
import { PedidoVenda } from '../../components/document/documento.statement.component';

interface SearchResponse {
  content: PedidoVenda[];
  nextLink: string;
}

interface SearchRequest {
  dataInicial: string;
  dataFinal: string;
  branchId: string;
  localidade: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderSalesService implements DocumentAngularSave {
  url = "http://localhost:8080/pedido-venda";

  constructor(private config: ConfigService, private httpClient: HttpClient) {
    this.url = config.getHost() + "/pedido-venda";
  }

  save(body: PedidoVenda): Observable<any> {
    return this.httpClient.post<any>(this.url + "/angular", body);
  }

  search(request: SearchRequest): Observable<SearchResponse> {
    return this.httpClient.post<SearchResponse>(`${this.url}/search`, request);
  }
}