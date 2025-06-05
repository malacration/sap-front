import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PedidoCarregamento {
  itemCode: string;
  cardCode: string;
  cardName: string;
  distribSum: number;
  docDate: string;
  quantity: string;
  qtdImediata?: number;
  qtdSemPrevisao?: number;
  Dscription: string;
  SlpName: string;
  // adicione outros campos conforme retorno real do back
}

@Injectable({
  providedIn: 'root',
})
export class PedidosCarregamentoService {
  private url = 'http://localhost:8080/sales-person/teste';

  constructor(private http: HttpClient) {
    const host = localStorage.getItem('host');
    if (host) this.url = `${host}/sales-person/teste`;
    console.log('📡 URL final do service:', this.url);
  }

  get(): Observable<PedidoCarregamento[]> {
    console.log('🔁 Dentro do service: fazendo GET para', this.url); // ADICIONE ISSO
    return this.http
      .get<{ value: PedidoCarregamento[] }>(this.url)
      .pipe(map((res) => res.value));
  }
}
