import { TokenCriado, TokenResumo } from '../../modulos/relatorio/modelos/token.model';
import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, defer, finalize, first, from, retry, switchMap, tap, throwError, timer } from 'rxjs';
import { EXECUCAO_ATIVA, Execucao } from '../../modulos/relatorio/modelos/execucao.model';
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

/** Intervalo de consulta do estado de uma execucao em andamento. */
export const INTERVALO_EXECUCAO_MS = 2000;

const CHAVE_ENTREGUES = 'relatorio-execucoes-entregues';

@Injectable({ providedIn: 'root' })
export class RelatorioService {
  private readonly apiUrl: string;

  /** Avisa o painel "Minhas execuções" que um pedido novo entrou na fila. */
  readonly execucaoIniciada$ = new Subject<Execucao>();

  /**
   * Execucoes que uma tela esta esperando agora (via [aguardarExecucao]). O
   * painel nao entrega essas - quem pediu entrega. Se a tela desistir (troca de
   * relatorio, recarga), o id sai daqui e o painel assume.
   */
  private readonly acompanhadas = new Set<string>();

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

  /**
   * Gera o relatorio e entrega o arquivo - mesma assinatura de quando a rota era
   * sincrona. Por baixo: pede a execucao (202 na hora), acompanha o estado e
   * baixa o arquivo ao concluir. Nenhuma requisicao fica presa a consulta, que
   * e o que o proxy na frente da API exige.
   */
  renderizar(
    id: number,
    formato: FormatoRelatorio,
    request: RenderRequest
  ): Observable<HttpResponse<Blob>> {
    return this.iniciarRender(id, formato, request).pipe(switchMap((execucao) => this.aguardarExecucao(execucao)));
  }

  iniciarRender(id: number, formato: FormatoRelatorio, request: RenderRequest): Observable<Execucao> {
    const params = new HttpParams().set('formato', formato);
    return this.comLogo(request).pipe(
      switchMap((corpo) =>
        this.http.post<Execucao>(`${this.apiUrl}/relatorios/${this.id(id)}/execucoes`, corpo, { params })
      ),
      tap((execucao) => this.execucaoIniciada$.next(execucao)),
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

  /** Prévia assíncrona, como [renderizar]. */
  preview(
    id: number,
    formato: FormatoRelatorio,
    request: RenderRequest,
    versao?: number
  ): Observable<HttpResponse<Blob>> {
    return this.iniciarPreview(id, formato, request, versao).pipe(
      switchMap((execucao) => this.aguardarExecucao(execucao)),
    );
  }

  iniciarPreview(id: number, formato: FormatoRelatorio, request: RenderRequest, versao?: number | null): Observable<Execucao> {
    let params = new HttpParams().set('formato', formato);
    if (versao != null) {
      params = params.set('versao', versao.toString());
    }
    return this.comLogo(request).pipe(
      switchMap((corpo) =>
        this.http.post<Execucao>(`${this.apiUrl}/admin/relatorios/${this.id(id)}/preview/execucoes`, corpo, { params })
      ),
      tap((execucao) => this.execucaoIniciada$.next(execucao)),
    );
  }

  // ---------------------------------------------------------- execuções

  listarExecucoes(): Observable<Execucao[]> {
    return this.http.get<Execucao[]>(`${this.apiUrl}/execucoes`);
  }

  obterExecucao(id: string): Observable<Execucao> {
    return this.http.get<Execucao>(`${this.apiUrl}/execucoes/${encodeURIComponent(id)}`);
  }

  baixarExecucao(id: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/execucoes/${encodeURIComponent(id)}/arquivo`, {
      observe: 'response',
      responseType: 'blob',
    }).pipe(tap(() => this.marcarEntregue(id)));
  }

  removerExecucao(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/execucoes/${encodeURIComponent(id)}`);
  }

  /**
   * Acompanha a execucao ate terminar e devolve o arquivo. Falha vira
   * HttpErrorResponse com o status e o envelope `erro`/`mensagem` que a rota
   * sincrona daria - as telas tratam erro exatamente como antes.
   */
  aguardarExecucao(execucao: Execucao, intervaloMs = INTERVALO_EXECUCAO_MS): Observable<HttpResponse<Blob>> {
    return defer(() => {
      this.acompanhadas.add(execucao.id);
      return timer(0, intervaloMs).pipe(
        // Falha de rede passageira nao derruba a espera.
        switchMap(() => this.obterExecucao(execucao.id).pipe(retry({ count: 3, delay: intervaloMs }))),
        first((atual) => !EXECUCAO_ATIVA.includes(atual.status)),
        switchMap((atual) => {
          if (atual.status === 'CONCLUIDO') {
            return this.baixarExecucao(atual.id);
          }
          const erro = atual.status === 'EXCLUIDO'
            ? { status: 410, erro: 'execucao_excluida', mensagem: 'O arquivo foi excluído. Gere o relatório novamente.' }
            : atual.erro || { status: 500, erro: 'erro_interno', mensagem: 'Não foi possível gerar o relatório.' };
          return throwError(() => new HttpErrorResponse({
            status: erro.status,
            error: { erro: erro.erro, mensagem: erro.mensagem },
          }));
        }),
        finalize(() => this.acompanhadas.delete(execucao.id)),
      );
    });
  }

  /** Uma tela esta esperando esta execucao agora? */
  estaSendoAcompanhada(id: string): boolean {
    return this.acompanhadas.has(id);
  }

  /** Ja foi baixada/aberta neste navegador? Evita entregar duas vezes apos recarregar. */
  foiEntregue(id: string): boolean {
    return this.entregues().includes(id);
  }

  marcarEntregue(id: string): void {
    const ids = this.entregues().filter((outro) => outro !== id);
    ids.push(id);
    try {
      localStorage.setItem(CHAVE_ENTREGUES, JSON.stringify(ids.slice(-200)));
    } catch {
      // Sem armazenamento (modo privado): no pior caso, o painel oferece de novo.
    }
  }

  private entregues(): string[] {
    try {
      const valor = JSON.parse(localStorage.getItem(CHAVE_ENTREGUES) || '[]');
      return Array.isArray(valor) ? valor : [];
    } catch {
      return [];
    }
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
