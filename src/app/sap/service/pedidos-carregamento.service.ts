import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface PedidoCarregamento {
  /* … */
}
@Injectable({ providedIn: 'root' })
export class PedidosCarregamentoService {
  private baseUrl = 'http://localhost:8080/painel/pedidos';

  constructor(private http: HttpClient) {}

  getByDates(
    dataInicial: string,
    dataFinal: string
  ): Observable<PedidoCarregamento[]> {
    const params = new HttpParams()
      .set('dataInicial', dataInicial)
      .set('dataFinal', dataFinal);

    return (
      this.http
        // 1) tipamos pra NextLink-like
        .get<{ content: PedidoCarregamento[]; nextLink: string }>(
          this.baseUrl,
          { params }
        )
        // 2) extraímos apenas o array que interessa
        .pipe(map((res) => res.content))
    );
  }
}
