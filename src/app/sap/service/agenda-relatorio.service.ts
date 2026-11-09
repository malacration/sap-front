import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

export interface AgendaRelatorio {
  ativo: boolean;
  /** ISO: 1 = segunda ... 7 = domingo */
  dias: number[];
  hora: string;
  copia: string[];
  ultimoEnvio?: string;
  ultimoStatus?: string;
  emAndamento?: boolean;
}

/** Agenda do e-mail de inadimplencia dos vendedores (UDO AGENDA_RELATORIO no SAP). */
@Injectable({
  providedIn: 'root'
})
export class AgendaRelatorioService {

  url = 'http://localhost:8080/agenda-relatorio/inadimplencia';

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + '/agenda-relatorio/inadimplencia';
  }

  get(): Observable<AgendaRelatorio> {
    return this.http.get<AgendaRelatorio>(this.url);
  }

  salvar(agenda: AgendaRelatorio): Observable<AgendaRelatorio> {
    return this.http.put<AgendaRelatorio>(this.url, agenda);
  }

  /** 202 = iniciou; 409 = ja existe um envio em andamento. */
  enviar(slpCode?: number, destino?: string): Observable<HttpResponse<void>> {
    let params = new HttpParams();
    if (slpCode) { params = params.set('slpCode', slpCode); }
    if (destino) { params = params.set('destino', destino); }
    return this.http.post<void>(this.url + '/enviar', null, { params, observe: 'response' });
  }
}
