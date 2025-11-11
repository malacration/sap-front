import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ConfigService } from '../../../../core/services/config.service';
import { DocumentAngularSave } from '../../../../sap/service/document/document-angular-save';
import { PedidoVenda } from '../../../../sap/components/document/documento.statement.component';
import { NextLink } from '../../../../sap/model/next-link';

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

  getPedidosBy(ordemId: number): Observable<PedidoVenda[]> {
    return this.hppCliente
      .get<NextLink<PedidoVenda>>(`${this.url}/findLoadOrders`, {
        params: { U_Ordem_Carregamento: ordemId.toString() }
      })
      .pipe(
        map((response: NextLink<PedidoVenda>) => {
          // A resposta tem propriedade 'content' com o array
          return response.content.map((item: any) => Object.assign(new PedidoVenda(), item));
        }),
        catchError((error) => {
          console.error('Erro no getPedidosBy:', error);
          return of([]); // Retorna array vazio em caso de erro
        })
      );
  }

  searchAll(nextLink: string): Observable<any> {
    return this.hppCliente.post(`${this.url}/findLoadOrders`, nextLink);
  }
}
