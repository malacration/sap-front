import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGX_LOADING_BAR_IGNORED } from '@ngx-loading-bar/http-client';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { SILENT_ERRORS } from '../../interceptors/error.interceptor';

/** Limite do backend por chamada (MinhasPermissoesController.MAXIMO_DE_CONSULTAS). */
export const MAXIMO_CONSULTAS_POR_CHAMADA = 100;

export interface PermissaoConsulta {
  metodo: string;
  caminho: string;
}

export interface PermissaoResposta extends PermissaoConsulta {
  permitido: boolean;
}

/**
 * "Quais destas chamadas eu posso fazer?" (MinhasPermissoesController no sap-service). Responde com as mesmas
 * regras do filtro de autorizacao, para os perfis do proprio usuario, na ordem pedida; no maximo 100 por chamada.
 * Todo usuario logado pode chamar.
 */
@Injectable({
  providedIn: 'root'
})
export class MinhasPermissoesService {

  private readonly url: string;

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + '/acesso/minhas-permissoes';
  }

  /** Consulta de fundo: sem modal de erro e sem barra de progresso (quem chama trata a falta de resposta). */
  consultar(consultas: PermissaoConsulta[]): Observable<PermissaoResposta[]> {
    const context = new HttpContext().set(SILENT_ERRORS, true).set(NGX_LOADING_BAR_IGNORED, true);
    return this.http.post<PermissaoResposta[]>(this.url, consultas, { context });
  }
}
