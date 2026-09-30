import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

/** Uma regra de um perfil: padrão de URL (o mesmo do rules.yml), métodos liberados e uma nota. */
export interface RegraAcesso {
  url: string;
  actions: string[];
  comentario?: string | null;
}

export interface DocumentoRegras {
  schema?: number;
  perfis: { [perfil: string]: RegraAcesso[] };
}

export interface VersaoResumo {
  versao: number;
  usuario?: string;
  usuarioId?: string;
  data?: string;
  hora?: string;
  origem?: string;
  comentario?: string;
  resumo?: string;
}

export interface EstadoRegras {
  versao: number;
  documento: DocumentoRegras;
  resumo: VersaoResumo;
  /** 'sap' ou 'arquivo': o que de fato está aplicando as regras no backend. */
  fonteAtiva: 'sap' | 'arquivo';
  /** Versão que a instância que respondeu está aplicando (só existe com fonte 'sap'). */
  versaoEmVigor?: number | null;
  perfisProtegidos: string[];
  arquivoLocal: string;
}

export interface MudancaRegra {
  url: string;
  antes: string[];
  depois: string[];
}

export interface MudancaPerfil {
  perfil: string;
  tipo: 'NOVO' | 'REMOVIDO' | 'ALTERADO';
  adicionadas: RegraAcesso[];
  removidas: RegraAcesso[];
  alteradas: MudancaRegra[];
}

export interface VersaoCompleta {
  resumo: VersaoResumo;
  documento: DocumentoRegras;
  diff: MudancaPerfil[];
}

export interface PreviaImportacao {
  versaoAtual: number;
  modo: string;
  diff: MudancaPerfil[];
  erros: string[];
  avisos: string[];
  documento: DocumentoRegras;
  /** Há algo a gravar (mudança de acesso, ou só de notas/ordem, que não aparece no diff). */
  temMudanca: boolean;
}

export interface ResultadoSimulacao {
  autorizado: boolean;
  regra?: { perfil: string; url: string; actions: string[] } | null;
  perfisSemRegras: string[];
  caminho: string;
}

export interface EndpointConhecido {
  url: string;
  metodo: string;
}

/**
 * Gestão das regras de acesso (perfil -> URLs e métodos), servida pelo sap-service em
 * /acesso/regras. Só o perfil admin chega lá. Toda gravação informa a `baseVersao` que a tela viu:
 * se alguém gravou antes, o backend responde 409 e a tela recarrega.
 */
@Injectable({
  providedIn: 'root'
})
export class RegrasAcessoService {

  url = 'http://localhost:8080/acesso/regras';

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + '/acesso/regras';
  }

  atual(): Observable<EstadoRegras> {
    return this.http.get<EstadoRegras>(this.url);
  }

  salvarPerfil(perfil: string, regras: RegraAcesso[], baseVersao: number, comentario: string): Observable<EstadoRegras> {
    return this.http.put<EstadoRegras>(this.url + '/perfis/' + encodeURIComponent(perfil), { regras, baseVersao, comentario });
  }

  removerPerfil(perfil: string, baseVersao: number, comentario: string): Observable<EstadoRegras> {
    const params = new HttpParams().set('baseVersao', baseVersao).set('comentario', comentario);
    return this.http.delete<EstadoRegras>(this.url + '/perfis/' + encodeURIComponent(perfil), { params });
  }

  versoes(): Observable<VersaoResumo[]> {
    return this.http.get<VersaoResumo[]>(this.url + '/versoes');
  }

  versao(numero: number): Observable<VersaoCompleta> {
    return this.http.get<VersaoCompleta>(this.url + '/versoes/' + numero);
  }

  restaurar(numero: number, baseVersao: number, comentario: string): Observable<EstadoRegras> {
    return this.http.post<EstadoRegras>(this.url + '/versoes/' + numero + '/restaurar', { baseVersao, comentario });
  }

  /** `simular = true` só devolve a prévia (com os erros, se houver); sem simular, grava. */
  importar(yaml: string, modo: 'mesclar' | 'substituir', simular: boolean, baseVersao?: number, comentario?: string): Observable<PreviaImportacao> {
    let params = new HttpParams().set('modo', modo).set('simular', simular);
    if (baseVersao != null) { params = params.set('baseVersao', baseVersao); }
    if (comentario) { params = params.set('comentario', comentario); }
    return this.http.post<PreviaImportacao>(this.url + '/importar', yaml, {
      params,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    });
  }

  exportar(versao?: number): Observable<string> {
    const params = versao != null ? new HttpParams().set('versao', versao) : new HttpParams();
    return this.http.get(this.url + '/exportar', { params, responseType: 'text' });
  }

  /** O YAML do arquivo em uso no servidor, para comparar com o cadastro. */
  arquivo(): Observable<string> {
    return this.http.get(this.url + '/arquivo', { responseType: 'text' });
  }

  simular(perfis: string[], metodo: string, caminho: string, rascunho?: DocumentoRegras): Observable<ResultadoSimulacao> {
    return this.http.post<ResultadoSimulacao>(this.url + '/simular', { perfis, metodo, caminho, rascunho });
  }

  endpoints(): Observable<EndpointConhecido[]> {
    return this.http.get<EndpointConhecido[]>(this.url + '/endpoints');
  }

  cobertura(url: string): Observable<EndpointConhecido[]> {
    return this.http.get<EndpointConhecido[]>(this.url + '/cobertura', { params: new HttpParams().set('url', url) });
  }
}
