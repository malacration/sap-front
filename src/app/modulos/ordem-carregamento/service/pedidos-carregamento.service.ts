import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Page } from '../../../sap/model/page.model';
import Big from 'big.js';
import { ConfigService } from '../../../core/services/config.service';

export interface PedidoCarregamento {
  content: any;
  nextLink: string;
  DocEntry?: number;
  DocDate?: string;
  CardCode?: string;
  CardName?: string;
  SlpCode?: number;
  SlpName?: string;
  ItemCode?: string;
  Description?: string;
  DistribSum?: number;
  Quantity?: number;
  OnHand?: number;
  EmOrdemDeCarregamento?: string;
}

@Injectable({ providedIn: 'root' })
export class PedidosCarregamentoService {
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
    agrupador?: string
  ): Observable<Page<PedidoCarregamento>> {
    let params = new HttpParams()
      .set('dataInicial', dataInicial)
      .set('dataFinal', dataFinal)
      .set('filial', filial.toString())
      .set('agrupador', agrupador || '');

    if (cliente) params = params.set('cliente', cliente);
    if (item) params = params.set('item', item);
    if (vendedor) params = params.set('vendedor', vendedor);

    return this.http.get<Page<PedidoCarregamento>>(this.baseUrl+'/pedidos', {
      params,
    });
  }
}
