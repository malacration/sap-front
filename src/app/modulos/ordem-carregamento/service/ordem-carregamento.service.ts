import { Injectable } from '@angular/core';
import { ConfigService } from '../../../core/services/config.service';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Page } from '../../../sap/model/page.model';
import { LinhaItem } from '../../../sap/model/venda/venda-futura';
import { OrdemCarregamento } from '../models/ordem-carregamento';
import { OrdemCarregamentoDto } from '../models/ordem-carregamento-dto';

export interface CarregamentoDetalhes {
  DocEntry: number;
  Quantity: number;
  Weight1: number;
  docEntryQuantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrdemCarregamentoService {
  private url: string;

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = `${this.config.getHost()}/carregamento`;
  }

  get(id: string): Observable<OrdemCarregamento> {
    return this.http.get<OrdemCarregamento>(`${this.url}/${id}`).pipe(
      map((ordem) => this.ordemCarregamentoAssign(ordem))
    );
  }

  getAll(page: number, allVendedores: boolean = false): Observable<Page<OrdemCarregamento>> {
    const endpoint = allVendedores ? `${this.url}/all` : this.url;
    return this.http.get<Page<OrdemCarregamento>>(`${endpoint}?page=${page}`).pipe(
      map((page) => {
        page.content = page.content
          .filter((ordem) => ordem.U_Status !== 'Falhou')
          .map((ordem) => this.ordemCarregamentoAssign(ordem));
        return page;
      })
    );
  }

  save(body: OrdemCarregamentoDto): Observable<any> {
    return this.http.post<any>(`${this.url}`, body);
  }

  finalizar(id: number): Observable<any> {
    return this.http.post(`${this.url}/${id}/finalizar`, {});
  }

  getEstoqueEmCarregamento(itemCode: string): Observable<number> {
    return this.http.get<number>(`${this.url}/estoque-em-carregamento?ItemCode=${itemCode}`);
  }

  saveSelectedLotes(docEntry: number, lotes: any): Observable<any> {
    return this.http.post(`${this.url}/generate-from-loading-order/${docEntry}`, lotes);
  }

  getDetalhes(id: number): Observable<CarregamentoDetalhes[]> {
    return this.http.get<CarregamentoDetalhes[]>(`${this.url}/${id}/detalhes`);
  }

  private ordemCarregamentoAssign(it: any): OrdemCarregamento {
    const ordemCarregamento = Object.assign(new OrdemCarregamento(), it);
    ordemCarregamento.Ord_CRG_LINHACollection = (it.ORD_CRG_LINHACollection || []).map(item =>
      Object.assign(new LinhaItem(), {
        DocEntry: item.docEntry,
        LineId: item.LineId,
        U_orderDocEntry: item.u_orderDocEntry,
        U_docNumPedido: item.u_docNumPedido,
        U_cardCode: item.u_cardCode,
        U_cardName: item.u_cardName,
        U_quantidade: item.u_quantidade,
        U_pesoItem: item.u_pesoItem
      })
    );
    return ordemCarregamento;
  }

  atualizarLogistica(docEntry: number, dados: { U_placa: string, U_motorista: string, U_pesoCaminhao?: string | number | null }): Observable<any>{
    return this.http.post(`${this.url}/${docEntry}/logistica`, dados);
  }

  atualizarStatus(docEntry: number, dados: any): Observable<any> {
    return this.http.post(`${this.url}/${docEntry}/status`, dados);
  }
}