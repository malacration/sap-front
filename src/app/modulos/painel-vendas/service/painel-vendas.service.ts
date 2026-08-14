import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { VendaMensal, VendaDetalhe, VendaProduto } from '../../../sap/model/venda-mensal.model';

@Injectable({ providedIn: 'root' })
export class PainelVendasService {
  private baseUrl = 'http://localhost:8080/painel-vendas';

  constructor(private config: ConfigService, private http: HttpClient) {
    this.baseUrl = config.getHost() + '/painel-vendas';
  }

  getTotaisMensais(slpCode?: number): Observable<VendaMensal[]> {
    let params = new HttpParams();
    if (slpCode != null) params = params.set('slpCode', slpCode.toString());
    return this.http.get<VendaMensal[]>(this.baseUrl + '/mensal', { params });
  }

  getDetalheMes(ano: number, mes: number, slpCode?: number): Observable<VendaDetalhe[]> {
    let params = new HttpParams();
    if (slpCode != null) params = params.set('slpCode', slpCode.toString());
    return this.http.get<VendaDetalhe[]>(`${this.baseUrl}/mensal/${ano}/${mes}`, { params });
  }

  getDetalheMesPorProduto(ano: number, mes: number, slpCode?: number): Observable<VendaProduto[]> {
    let params = new HttpParams();
    if (slpCode != null) params = params.set('slpCode', slpCode.toString());
    return this.http.get<VendaProduto[]>(`${this.baseUrl}/mensal/${ano}/${mes}/produtos`, { params });
  }
}
