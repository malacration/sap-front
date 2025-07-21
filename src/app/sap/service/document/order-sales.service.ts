import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map,Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { DocumentAngularSave } from './document-angular-save';
import { PedidoVenda } from '../../components/document/documento.statement.component';
import { NextLink } from '../../model/next-link';

@Injectable({
  providedIn: 'root'
})
export class OrderSalesService  implements DocumentAngularSave{

  url = "http://localhost:8080/pedido-venda"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
      this.url = config.getHost()+"/pedido-venda"
  }

  save(body : PedidoVenda) : Observable<any>{
    return this.hppCliente.post<any>(this.url+"/angular",body)
  }

    search(dataInicial: string, dataFinal: string, filial: string, localidade: string): Observable<NextLink<PedidoVenda>> {
    let params = new HttpParams()
      .set('filial', filial.toString())
      .set('localidade', localidade.toString());

    if (dataInicial) {
      params = params.set('dataInicial', dataInicial);
    }

    if (dataFinal) {
      params = params.set('dataFinal', dataFinal);
    }

    return this.hppCliente
      .get<NextLink<PedidoVenda>>(`${this.url}/search`, { params })
      .pipe(
        map((response) => {
          response.content = response.content.map((item) => Object.assign(new PedidoVenda(), item));
          return response;
        })
      );
  }

  searchAll(nextLink: string): Observable<NextLink<PedidoVenda>> {
    return this.hppCliente
      .post<NextLink<PedidoVenda>>(`${this.url}/searchAll`, nextLink)
      .pipe(
        map((response) => {
          response.content = response.content.map((item) => Object.assign(new PedidoVenda(), item));
          return response;
        })
      );
  }

updateOrdemCarregamento(pedidoId: string, ordemCarregamentoId: number): Observable<any> {
  const body = {
    U_Ordem_Carregamento: ordemCarregamentoId
  };
  
  return this.hppCliente.post(
    `${this.url}/${pedidoId}/ordem-carregamento`,
    body
  );
}   
}
