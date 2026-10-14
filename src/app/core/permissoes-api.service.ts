import { Injectable } from '@angular/core';
import { NavigationEnd, Route, Router } from '@angular/router';
import { Observable, Subject, distinctUntilChanged, filter, firstValueFrom, map, timeout } from 'rxjs';
import { MAXIMO_CONSULTAS_POR_CHAMADA, MinhasPermissoesService } from '../sap/service/minhas-permissoes.service';
import { AuthService } from '../shared/service/auth.service';
import { OfflineContextService } from './offline/offline-context.service';
import { ConfigService } from './services/config.service';
import { ApiDaRota, apisDaRota } from './route-flags';

/** Ultima resposta do backend, guardada para o F5 e para o modo offline. */
interface Guardado {
  /** offline.currentOwnerKey(): host + usuario. Resposta de outro usuario nao vale. */
  dono: string;
  /** Perfis do token na hora da busca. Resposta para outros perfis nao vale (token renovado com outro perfil). */
  perfis: string;
  /** Chaves perguntadas: um build novo com outras rotas busca de novo. */
  lista: string;
  respostas: Record<string, boolean>;
  buscadoEm: number;
}

/** Quem esta usando o app agora, como a busca e o cache enxergam. */
interface Identidade {
  dono: string;
  perfis: string;
}

const CHAVE_STORAGE = 'permissoes_api';
/** Mudanca feita na tela de Regras de Acesso chega no menu em ate este tempo (ou no proximo login). */
const VALIDADE_MS = 5 * 60 * 1000;
/** Backend fora do ar: nao tenta de novo a cada navegacao. */
const ESPERA_APOS_FALHA_MS = 30 * 1000;
/** Requisicao pendurada nao pode segurar as buscas seguintes para sempre. */
const PRAZO_DA_CHAMADA_MS = 15 * 1000;

/**
 * Pergunta ao backend quais das URLs declaradas nas rotas ("api:get:/x") o usuario pode chamar. O backend
 * responde com as mesmas regras e o mesmo casamento do filtro, entao a tela aparece se e so se a chamada
 * principal dela nao vai dar 403. Liberou a URL na tela de Regras de Acesso, a tela aparece, sem deploy.
 *
 * Uma chamada por login (e no maximo uma a cada 5 minutos depois), com ~40 casamentos em memoria no backend.
 * Sem resposta (backend fora, primeiro acesso offline, token com outros perfis) `permitido` devolve undefined
 * e quem chama usa o "role:" da rota, como antes. Com a flag `menuPorPermissao` desligada nada aqui roda.
 */
@Injectable({ providedIn: 'root' })
export class PermissoesApiService {

  /** Emite quando chega uma resposta diferente da anterior: o menu se refaz. */
  readonly changes$: Observable<void>;

  private readonly mudou = new Subject<void>();
  private guardado: Guardado | null = null;
  private apis: ApiDaRota[] | null = null;
  private emVoo: Promise<void> | null = null;
  /** De quem e a busca em voo: a de outro usuario nao segura a do usuario atual. */
  private vooDe: Identidade | null = null;
  /** Numero da busca mais recente: so ela grava resposta ou falha (uma antiga pode terminar depois, u1 -> u2 -> u1). */
  private geracao = 0;
  /** Geracao da busca em voo: uma busca de antes do login ou do logout nao segura a do usuario que entrou agora. */
  private vooGeracao = 0;
  private falhou: { assinatura: string; em: number } | null = null;
  private iniciado = false;

  constructor(
    private minhasPermissoes: MinhasPermissoesService,
    private config: ConfigService,
    private auth: AuthService,
    private offline: OfflineContextService,
    private router: Router,
  ) {
    this.changes$ = this.mudou.asObservable();
  }

  get ativo(): boolean {
    return this.config.isMenuPorPermissao();
  }

  /** Chamado uma vez no boot (APP_INITIALIZER), depois do contexto offline. Nao bloqueia: so dispara a busca. */
  iniciar(): void {
    if (!this.ativo || this.iniciado) {
      return;
    }
    this.iniciado = true;
    this.guardado = this.lerStorage();
    this.auth.loginChange$.subscribe(() => this.aoMudarLogin());
    // Subiu sem backend e ele voltou sem login nem navegacao: sem isto o menu ficaria no role: ate o proximo evento.
    this.offline.state$
      .pipe(map(estado => estado.backendOnline), distinctUntilChanged(), filter(online => online))
      .subscribe(() => this.atualizarSeNecessario());
    // Cobre o token renovado com outro perfil e a validade de 5 minutos sem timer proprio.
    this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd))
      .subscribe(() => this.atualizarSeNecessario());
    this.atualizarSeNecessario();
  }

  /**
   * true se alguma das APIs e permitida; false se todas foram respondidas e nenhuma e; undefined se nao ha
   * resposta para o usuario e os perfis atuais (quem chama usa o "role:").
   */
  permitido(apis: ApiDaRota[]): boolean | undefined {
    const respostas = this.respostasDoUsuario();
    if (!respostas || apis.length === 0) {
      return undefined;
    }
    let semResposta = false;
    for (const api of apis) {
      const resposta = respostas[api.chave];
      if (resposta === true) {
        return true;
      }
      if (resposta === undefined) {
        semResposta = true;
      }
    }
    return semResposta ? undefined : false;
  }

  /**
   * Para o guard: espera a busca em andamento (ou a que for preciso disparar) por no maximo `timeoutMs`. Se a busca
   * era de outro usuario (troca de login com ela em voo), espera tambem a do usuario atual, dentro do mesmo prazo.
   */
  async whenReady(timeoutMs: number): Promise<void> {
    if (!this.ativo) {
      return;
    }
    const prazo = Date.now() + timeoutMs;
    this.atualizarSeNecessario();
    let emVoo = this.emVoo;
    while (emVoo) {
      const resta = prazo - Date.now();
      if (resta <= 0) {
        return;
      }
      await this.esperar(emVoo, resta);
      if (this.emVoo === emVoo) {
        return;
      }
      this.atualizarSeNecessario();
      emVoo = this.emVoo;
    }
  }

  /** Busca se nao ha resposta valida para este usuario, perfis e rotas, ou se ela passou de 5 minutos. */
  atualizarSeNecessario(): void {
    if (!this.ativo) {
      return;
    }
    if (!this.auth.isLoggedIn() || this.auth.isCliente() || !this.offline.backendOnline) {
      return;
    }
    const quem = this.identidade();
    const apis = this.listaDeApis();
    if (!quem || apis.length === 0) {
      return;
    }
    // Ja ha busca para esta identidade: espera ela. Se a busca em voo e de outro usuario (troca de login com ela
    // pendente), a do usuario atual comeca agora; a antiga termina sozinha e e descartada.
    if (this.emVoo && this.vooDe && this.mesmaIdentidade(this.vooDe, quem) && this.vooGeracao === this.geracao) {
      return;
    }
    const lista = apis.map(api => api.chave).join('|');
    const guardado = this.guardado;
    if (guardado && this.mesmaIdentidade(guardado, quem) && guardado.lista === lista
      && Date.now() - guardado.buscadoEm < VALIDADE_MS) {
      return;
    }
    const assinatura = `${quem.dono}#${quem.perfis}#${lista}`;
    if (this.falhou?.assinatura === assinatura && Date.now() - this.falhou.em < ESPERA_APOS_FALHA_MS) {
      return;
    }

    const trocouNoMeio = () => {
      const agora = this.identidade();
      return !agora || !this.mesmaIdentidade(agora, quem);
    };
    const geracao = ++this.geracao;
    const obsoleta = () => geracao !== this.geracao || trocouNoMeio();
    const voo: Promise<void> = this.buscar(apis)
      .then(respostas => {
        // Trocou de usuario (ou de perfis) enquanto a resposta vinha, ou ja ha busca mais nova: esta nao vale para
        // quem esta agora, nem mexe no estado de falha da busca do usuario atual.
        if (obsoleta()) {
          return;
        }
        this.falhou = null;
        const anteriores = this.respostasDoUsuario();
        this.guardado = { ...quem, lista, respostas, buscadoEm: Date.now() };
        this.gravarStorage(this.guardado);
        if (JSON.stringify(anteriores) !== JSON.stringify(respostas)) {
          this.mudou.next();
        }
      })
      .catch(() => {
        if (!obsoleta()) {
          this.falhou = { assinatura, em: Date.now() };
        }
      })
      .finally(() => {
        if (this.emVoo === voo) {
          this.emVoo = null;
          this.vooDe = null;
        }
        // Com sucesso ou erro: se esta busca ficou para tras (outro usuario, login ou logout no meio) e ninguem buscou
        // ainda para quem esta agora, busca agora, sem esperar navegacao.
        if (obsoleta()) {
          this.atualizarSeNecessario();
        }
      });
    this.emVoo = voo;
    this.vooDe = quem;
    this.vooGeracao = geracao;
  }

  /**
   * Login ou logout: a resposta guardada era da sessao anterior. Ao sair ela e descartada (o proximo login, do mesmo
   * usuario ou de outro, comeca sem ela); ao entrar fica velha e e buscada de novo. O F5 nao passa por aqui e segue
   * usando a resposta guardada.
   */
  private aoMudarLogin(): void {
    this.geracao++;
    if (!this.auth.isLoggedIn()) {
      this.guardado = null;
      this.falhou = null;
      this.removerStorage();
      this.mudou.next();
      return;
    }
    if (this.guardado) {
      this.guardado = { ...this.guardado, buscadoEm: 0 };
    }
    this.falhou = null;
    this.atualizarSeNecessario();
  }

  private esperar(promessa: Promise<void>, ms: number): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<void>(resolve => {
      timer = setTimeout(resolve, ms);
    });
    return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
  }

  private identidade(): Identidade | null {
    const dono = this.offline.currentOwnerKey();
    if (!dono) {
      return null;
    }
    return { dono, perfis: [...new Set(this.auth.getRoles())].sort().join(',') };
  }

  private mesmaIdentidade(a: Identidade, b: Identidade): boolean {
    return a.dono === b.dono && a.perfis === b.perfis;
  }

  /**
   * Respostas que valem para quem esta usando agora: mesmo dono e mesmos perfis. Offline, os perfis saem do
   * token guardado (o mesmo da ultima busca); sem token, nao ha resposta e vale o "role:".
   */
  private respostasDoUsuario(): Record<string, boolean> | null {
    if (!this.ativo) {
      return null;
    }
    const guardado = this.guardado ?? this.lerStorage();
    this.guardado = guardado;
    const quem = this.identidade();
    if (!guardado || !quem || !this.mesmaIdentidade(guardado, quem)) {
      return null;
    }
    return guardado.respostas;
  }

  private async buscar(apis: ApiDaRota[]): Promise<Record<string, boolean>> {
    const respostas: Record<string, boolean> = {};
    const tamanho = MAXIMO_CONSULTAS_POR_CHAMADA;
    for (let inicio = 0; inicio < apis.length; inicio += tamanho) {
      const lote = apis.slice(inicio, inicio + tamanho);
      const corpo = lote.map(api => ({ metodo: api.metodo, caminho: api.caminho }));
      const resposta = await firstValueFrom(this.minhasPermissoes.consultar(corpo).pipe(timeout(PRAZO_DA_CHAMADA_MS)));
      if (!Array.isArray(resposta) || resposta.length !== lote.length) {
        throw new Error('Resposta de /acesso/minhas-permissoes fora do formato esperado');
      }
      lote.forEach((api, i) => {
        respostas[api.chave] = resposta[i]?.permitido === true;
      });
    }
    return respostas;
  }

  /** Todas as "api:" do router.config, inclusive filhos e rotas escondidas do menu (o guard tambem usa). */
  private listaDeApis(): ApiDaRota[] {
    if (this.apis) {
      return this.apis;
    }
    const porChave = new Map<string, ApiDaRota>();
    const visitar = (rotas: Route[] | undefined) => {
      for (const rota of rotas ?? []) {
        apisDaRota(rota).forEach(api => porChave.set(api.chave, api));
        visitar(rota.children);
      }
    };
    visitar(this.router.config);
    this.apis = [...porChave.values()].sort((a, b) => a.chave.localeCompare(b.chave));
    return this.apis;
  }

  private lerStorage(): Guardado | null {
    try {
      const texto = localStorage.getItem(CHAVE_STORAGE);
      const lido = texto ? JSON.parse(texto) : null;
      const valido = lido && typeof lido.dono === 'string' && typeof lido.perfis === 'string'
        && lido.respostas && typeof lido.respostas === 'object';
      return valido ? lido : null;
    } catch {
      return null;
    }
  }

  private removerStorage(): void {
    try {
      localStorage.removeItem(CHAVE_STORAGE);
    } catch {
      // sem storage nao ha o que apagar
    }
  }

  private gravarStorage(guardado: Guardado): void {
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(guardado));
    } catch {
      // Sem storage o menu so perde o cache do F5/offline; segue com a resposta em memoria.
    }
  }
}
