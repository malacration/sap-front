import { TokenCriado, TokenResumo } from '../../modulos/relatorio/modelos/token.model';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { LogoService } from '../../core/services/logo.service';
import {
  ExemploRelatorio,
  Erro,
  EventoAuditoria,
  FormatoRelatorio,
  RelatorioAdmin,
  RelatorioAdminDetalhe,
  RelatorioDetalhe,
  RelatorioResumo,
  RenderRequest,
  UploadRequest,
  ValidacaoFalha,
  ValidacaoOk,
  Versao,
} from '../../modulos/relatorio/modelos/relatorio.model';

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  private readonly apiUrl: string;

  constructor(private config: ConfigService, private http: HttpClient, private logo: LogoService) {
    // Pode ser host dedicado (config `hostRelatorios`) ou o mesmo host com o
    // prefixo do gateway - a decisao fica no ConfigService, nao aqui.
    this.apiUrl = this.config.getHostRelatorios();
  }

  listar(): Observable<RelatorioResumo[]> {
    return this.http.get<RelatorioResumo[]>(`${this.apiUrl}/relatorios`);
  }

  obter(id: number): Observable<RelatorioDetalhe> {
    return this.http.get<RelatorioDetalhe>(`${this.apiUrl}/relatorios/${this.id(id)}`);
  }

  renderizar(
    id: number,
    formato: FormatoRelatorio,
    request: RenderRequest
  ): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('formato', formato);
    return this.comLogo(request).pipe(
      switchMap((corpo) =>
        this.http.post(`${this.apiUrl}/relatorios/${this.id(id)}/render`, corpo, {
          params,
          observe: 'response',
          responseType: 'blob',
        })
      )
    );
  }

  listarAdmin(): Observable<RelatorioAdmin[]> {
    return this.http.get<RelatorioAdmin[]>(`${this.apiUrl}/admin/relatorios`);
  }

  obterAdmin(id: number, versao?: number): Observable<RelatorioAdminDetalhe> {
    let params = new HttpParams();
    if (versao != null) {
      params = params.set('versao', versao.toString());
    }
    return this.http.get<RelatorioAdminDetalhe>(`${this.apiUrl}/admin/relatorios/${this.id(id)}`, { params });
  }

  criar(request: UploadRequest): Observable<RelatorioAdmin> {
    return this.http.post<RelatorioAdmin>(`${this.apiUrl}/admin/relatorios`, request);
  }

  criarVersao(id: number, request: UploadRequest): Observable<RelatorioAdmin> {
    return this.http.put<RelatorioAdmin>(
      `${this.apiUrl}/admin/relatorios/${this.id(id)}`,
      request
    );
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/relatorios/${this.id(id)}`);
  }

  validar(request: UploadRequest): Observable<ValidacaoOk> {
    return this.http.post<ValidacaoOk>(`${this.apiUrl}/admin/relatorios/validar`, request);
  }

  preview(
    id: number,
    formato: FormatoRelatorio,
    request: RenderRequest,
    versao?: number
  ): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('formato', formato);
    if (versao != null) {
      params = params.set('versao', versao.toString());
    }
    return this.comLogo(request).pipe(
      switchMap((corpo) =>
        this.http.post(`${this.apiUrl}/admin/relatorios/${this.id(id)}/preview`, corpo, {
          params,
          observe: 'response',
          responseType: 'blob',
        })
      )
    );
  }

  publicar(id: number, versao: number): Observable<RelatorioAdmin> {
    return this.http.post<RelatorioAdmin>(`${this.apiUrl}/admin/relatorios/${this.id(id)}/publicar`, { versao });
  }

  listarVersoes(id: number): Observable<Versao[]> {
    return this.http.get<Versao[]>(`${this.apiUrl}/admin/relatorios/${this.id(id)}/versoes`);
  }

  rollback(id: number, versao: number): Observable<RelatorioAdmin> {
    return this.http.post<RelatorioAdmin>(
      `${this.apiUrl}/admin/relatorios/${this.id(id)}/rollback/${versao}`,
      {}
    );
  }

  listarAuditoria(id: number): Observable<EventoAuditoria[]> {
    return this.http.get<EventoAuditoria[]>(`${this.apiUrl}/admin/relatorios/${this.id(id)}/auditoria`);
  }

  listarExemplos(): Observable<ExemploRelatorio[]> {
    return this.http.get<ExemploRelatorio[]>(`${this.apiUrl}/admin/exemplos`);
  }

  obterSchema(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.apiUrl}/admin/schema`);
  }

  async lerErro(error: unknown): Promise<Erro | ValidacaoFalha | undefined> {
    const httpError = error as { error?: unknown };
    let body = httpError?.error;
    if (body instanceof Blob) {
      const text = await body.text();
      try {
        body = JSON.parse(text);
      } catch {
        return text ? { erro: 'erro_http', mensagem: text } : undefined;
      }
    }
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return { erro: 'erro_http', mensagem: String(body) };
      }
    }
    if (body && typeof body === 'object' && 'erro' in body && 'mensagem' in body) {
      return body as Erro | ValidacaoFalha;
    }
    return undefined;
  }

  nomeArquivo(response: HttpResponse<Blob>, fallback: string): string {
    const disposition = response.headers.get('Content-Disposition') || '';
    const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const simples = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
    let nome = fallback;
    try {
      nome = utf8 ? decodeURIComponent(utf8[1]) : (simples?.[1] || fallback);
    } catch {
      nome = simples?.[1] || fallback;
    }
    return nome.split(/[\\/]/).pop() || fallback;
  }

  /**
   * Anexa a logo do sistema ao pedido. Vai daqui, e nao de cada tela, para PDF,
   * HTML e prévia sairem todos com a mesma marca sem ninguém precisar lembrar.
   */
  private comLogo(request: RenderRequest): Observable<RenderRequest> {
    if (request.logo !== undefined) {
      return from([request]);
    }
    return from(this.logo.dataUri().then((logo) => ({ ...request, logo })));
  }

  private id(id: number): string {
    return encodeURIComponent(String(id));
  }


  /**
   * Lista TODOS os relatorios, inclusive rascunhos (somente admin).
   *
   * A listagem publica (`listar`) devolve so os publicados - correto para o
   * consumidor, mas deixa o autor sem enxergar o proprio rascunho.
   */
  listarTodos(): Observable<RelatorioAdmin[]> {
    return this.http.get<RelatorioAdmin[]>(`${this.apiUrl}/admin/relatorios`);
  }

  // ---------------------------------------------------------- tokens de IA

  listarTokens(): Observable<TokenResumo[]> {
    return this.http.get<TokenResumo[]>(`${this.apiUrl}/admin/tokens`);
  }

  criarToken(nome: string, diasValidade: number): Observable<TokenCriado> {
    return this.http.post<TokenCriado>(`${this.apiUrl}/admin/tokens`, { nome, diasValidade });
  }

  revogarToken(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/tokens/${encodeURIComponent(id)}`);
  }

  /**
   * Pacote de instrucoes para IA (zip com as pastas claude/ e chatgpt/).
   *
   * E o backend que monta, para o conteudo acompanhar a versao da API
   * implantada - documentacao que mora noutro projeto diverge.
   */
  baixarSkill(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/admin/skill`, {
      observe: 'response',
      responseType: 'blob',
    });
  }
}
