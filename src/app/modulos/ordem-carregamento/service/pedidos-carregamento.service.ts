import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Page } from '../../../sap/model/page.model';
import Big from 'big.js';
import { ConfigService } from '../../../core/services/config.service';
import { PainelExpedicaoPedidos } from '../../../sap/model/painel-expedicao-pedidos.model';
import { Localidade } from '../../../sap/model/localidade/localidade';

@Injectable({ providedIn: 'root' })
export class PainelExpedicaoPedidosService {
  private baseUrl = 'http://localhost:8080/painel';
  DistribSum: any;

  constructor(private config : ConfigService, private http : HttpClient) {
      this.baseUrl = config.getHost()+"/painel"
  }

  getByFilters(
    dataInicial: string,
    dataFinal: string,
    filial: number,
    cliente?: string,
    item?: string,
    vendedor?: string,
    agrupador?: string,
    localidade?: Localidade,
    incoterms?: string
  ): Observable<Page<PainelExpedicaoPedidos>> {
    let params = new HttpParams()
      .set('dataInicial', dataInicial)
      .set('dataFinal', dataFinal)
      .set('filial', filial.toString())
      .set('agrupador', agrupador || '')
      .set('localidade', localidade?.Code ?? '')
      .set('incoterms',incoterms);

    if (cliente) params = params.set('cliente', cliente);
    if (item) params = params.set('item', item);
    if (vendedor) params = params.set('vendedor', vendedor);

    return this.http.get<Page<PainelExpedicaoPedidos>>(this.baseUrl + '/pedidos', {
      params,
    });
  }
}
