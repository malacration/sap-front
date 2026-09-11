import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

export interface Regra {
  codigo: string;
  descricao: string;
  ordem?: number;
  ativo?: boolean;
}

/**
 * Catálogo de regras de trava, servido pelo sap-service a partir do UDO
 * TRAVA_REGRA no SAP. Usado pelo select da tela de liberação e pela tela de
 * administração de regras. Adicionar/editar/apagar aqui não mexe em código.
 */
@Injectable({
  providedIn: 'root'
})
export class TravaRegraService {

  url = 'http://localhost:8080/trava';

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + '/trava';
  }

  getRegras(todas = false): Observable<Regra[]> {
    return this.http.get<Regra[]>(this.url + '/regras' + (todas ? '?todas=true' : ''));
  }

  salvar(regra: Regra, editando = false): Observable<Regra> {
    if (editando) {
      return this.http.put<Regra>(this.url + '/regras/' + encodeURIComponent(regra.codigo), regra);
    }
    return this.http.post<Regra>(this.url + '/regras', regra);
  }

  deletar(codigo: string): Observable<void> {
    return this.http.delete<void>(this.url + '/regras/' + encodeURIComponent(codigo));
  }
}
