import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Page } from '../../../sap/model/page.model';
import Big from 'big.js';
import { ConfigService } from '../../../core/services/config.service';
import { PainelExpedicaoPedidos } from '../../../sap/model/painel-expedicao-pedidos.model';
import { Localidade } from '../../../sap/model/localidade/localidade';

export interface PainelExpedicaoTotais {
  linhas: number;
  pedidos: number;
  notasVendaFutura: number;
}

@Injectable({ providedIn: 'root' })
export class PainelExpedicaoPedidosService {
  private baseUrl = 'http://localhost:8080/painel';
  DistribSum: any;

  constructor(private config : ConfigService, private http : HttpClient) {
      this.baseUrl = config.getHost()+"/painel"
  }

  private filtros(
    dataInicial: string,
    dataFinal: string,
    filial: number[],
    cliente?: string,
    item?: string,
    vendedor?: string,
    localidade?: Localidade,
    incoterms?: string,
    tipo?: string,
    frete: string = 'todos',
    emOrdem: string | null = 'Todos'
  ): HttpParams {
    let params = new HttpParams()
      .set('dataInicial', dataInicial)
      .set('dataFinal', dataFinal)
      .set('localidade', localidade?.Code ?? '')
      .set('incoterms',incoterms)
      .set('frete', frete)
      .set('emOrdem', emOrdem === 'Sim' ? 'sim' : emOrdem === 'Não' ? 'nao' : 'todos');

    filial.forEach((f) => (params = params.append('filial', f.toString())));
    if (cliente) params = params.set('cliente', cliente);
    if (item) params = params.set('item', item);
    if (vendedor) params = params.set('vendedor', vendedor);
    if (tipo) params = params.set('tipo', tipo);
    return params;
  }

  getByFilters(
    dataInicial: string,
    dataFinal: string,
    filial: number[],
    cliente?: string,
    item?: string,
    vendedor?: string,
    agrupador?: string,
    localidade?: Localidade,
    incoterms?: string,
    tipo?: string,
    frete: string = 'todos',
    emOrdem: string | null = 'Todos',
    page: number = 0,
    size: number = 50
  ): Observable<Page<PainelExpedicaoPedidos>> {
    const params = this.filtros(dataInicial, dataFinal, filial, cliente, item, vendedor, localidade, incoterms, tipo, frete, emOrdem)
      .set('agrupador', agrupador || '')
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<Page<PainelExpedicaoPedidos>>(this.baseUrl + '/pedidos', {
      params,
    });
  }

  getTotais(
    dataInicial: string,
    dataFinal: string,
    filial: number[],
    cliente?: string,
    item?: string,
    vendedor?: string,
    localidade?: Localidade,
    incoterms?: string,
    tipo?: string,
    frete: string = 'todos',
    emOrdem: string | null = 'Todos'
  ): Observable<PainelExpedicaoTotais> {
    const params = this.filtros(dataInicial, dataFinal, filial, cliente, item, vendedor, localidade, incoterms, tipo, frete, emOrdem);
    return this.http.get<PainelExpedicaoTotais>(this.baseUrl + '/pedidos/totais', { params });
  }
}
