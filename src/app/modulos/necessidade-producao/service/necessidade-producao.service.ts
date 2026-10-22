import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import {
  DepositoNecessidade,
  NecessidadeProducao,
  NecessidadeProducaoDetalhe,
  NecessidadeProducaoDetalheFiltro,
  NecessidadeProducaoFiltro,
} from '../modelos/necessidade-producao.model';

@Injectable({ providedIn: 'root' })
export class NecessidadeProducaoService {
  private readonly baseUrl: string;

  constructor(private config: ConfigService, private http: HttpClient) {
    this.baseUrl = this.config.getHost() + '/relatorios/necessidade-producao';
  }

  getDepositos(itemDe: string, itemAte: string): Observable<DepositoNecessidade[]> {
    const params = new HttpParams().set('itemDe', itemDe).set('itemAte', itemAte);
    return this.http.get<DepositoNecessidade[]>(this.baseUrl + '/depositos', { params });
  }

  get(filtro: NecessidadeProducaoFiltro): Observable<NecessidadeProducao> {
    let params = this.filiais(new HttpParams().set('itemDe', filtro.itemDe).set('itemAte', filtro.itemAte), filtro.filiais);
    filtro.depositos.forEach((deposito) => (params = params.append('depositos', deposito)));
    return this.http.get<NecessidadeProducao>(this.baseUrl, { params });
  }

  /** Documentos de uma celula. So a venda, entao so as filiais. */
  getDetalhe(filtro: NecessidadeProducaoDetalheFiltro): Observable<NecessidadeProducaoDetalhe> {
    const params = this.filiais(new HttpParams().set('itemCode', filtro.itemCode).set('detalhe', filtro.detalhe), filtro.filiais);
    return this.http.get<NecessidadeProducaoDetalhe>(this.baseUrl + '/detalhe', { params });
  }

  private filiais(params: HttpParams, filiais: number[]): HttpParams {
    filiais.forEach((filial) => (params = params.append('filiais', filial.toString())));
    return params;
  }
}
