import { Component, OnInit } from '@angular/core';
import { Observable, lastValueFrom } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { AlertService } from '../../../shared/service/alert.service';
import {
  DocumentoRegras,
  EndpointConhecido,
  EstadoRegras,
  PreviaImportacao,
  RegrasAcessoService,
  RegraAcesso,
  ResultadoSimulacao,
  VersaoCompleta,
  VersaoResumo,
} from '../../service/regras-acesso.service';

type Aba = 'perfis' | 'testar' | 'historico' | 'importar';

/** Um endpoint real do sistema, com os métodos que ele aceita, para o autocomplete da URL. */
interface SugestaoUrl {
  url: string;
  metodos: string[];
}

/** Uma linha da tabela de regras do perfil em edição (cópia local, só vai ao backend ao salvar). */
interface LinhaRegra {
  url: string;
  actions: string[];
  comentario: string;
  /** Endpoints reais que a URL alcança, calculado sob demanda. */
  cobertura?: EndpointConhecido[];
  /** URL para a qual `cobertura` foi calculada (evita repetir a consulta quando nada mudou). */
  coberturaDe?: string;
}

/**
 * Gestão das regras de acesso: perfil -> URLs e métodos. Substitui a edição do rules.yml no servidor.
 * Cada gravação cria uma versão nova (histórico, diff e restaurar). O que decide o acesso de verdade
 * é o backend; esta tela só edita o cadastro e testa "este perfil pode chamar isto?".
 */
@Component({
  selector: 'app-regras-acesso',
  templateUrl: './regras-acesso.component.html',
})
export class RegrasAcessoComponent implements OnInit {

  readonly ACOES = ['get', 'post', 'put', 'patch', 'delete', '*'];
  readonly METODOS = ['get', 'post', 'put', 'patch', 'delete'];

  aba: Aba = 'perfis';
  estado?: EstadoRegras;
  carregando = false;

  // ---- perfis e regras
  perfilSelecionado: string | null = null;
  criandoPerfil = false;
  nomeNovoPerfil = '';
  linhas: LinhaRegra[] = [];
  private linhasOriginais = '[]';
  /** Outra pessoa gravou enquanto havia um rascunho aqui: o rascunho foi mantido, mas está baseado numa versão velha. */
  conflitoPendente = false;
  sugestoes: SugestaoUrl[] = [];

  // ---- testar acesso
  teste = { perfis: [] as string[], metodo: 'get', caminho: '', usarRascunho: false };
  resultado?: ResultadoSimulacao;
  /** Método usado na consulta que gerou `resultado` (o campo do formulário pode ter mudado depois). */
  resultadoMetodo = 'get';
  private seqSimulacao = 0;

  // ---- histórico
  versoes: VersaoResumo[] = [];
  versaoAberta?: VersaoCompleta;
  private historicoDesatualizado = true;
  private seqHistorico = 0;

  // ---- importar / exportar
  yaml = '';
  modo: 'mesclar' | 'substituir' = 'mesclar';
  previa?: PreviaImportacao;

  constructor(
    private service: RegrasAcessoService,
    private alert: AlertService,
    private config: ConfigService,
  ) {}

  ngOnInit(): void {
    this.carregar();
    // Só alimenta o autocomplete da URL; se falhar, a tela segue funcionando sem ele.
    this.service.endpoints().subscribe({
      next: e => this.sugestoes = this.agruparPorUrl(e),
      error: () => { /* sem autocomplete */ },
    });
  }

  /** Um item por URL, com todos os métodos que ela aceita (o catálogo traz uma linha por URL+método). */
  private agruparPorUrl(endpoints: EndpointConhecido[]): SugestaoUrl[] {
    const porUrl = new Map<string, Set<string>>();
    for (const e of endpoints) {
      const metodos = porUrl.get(e.url) ?? new Set<string>();
      metodos.add(e.metodo === '*' ? 'TODOS' : e.metodo.toUpperCase());
      porUrl.set(e.url, metodos);
    }
    return [...porUrl.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([url, metodos]) => ({ url, metodos: [...metodos] }));
  }

  // ------------------------------------------------------------------ estado geral

  get perfis(): string[] {
    return this.estado ? Object.keys(this.estado.documento.perfis) : [];
  }

  get perfisParaTeste(): string[] {
    const novo = this.criandoPerfil ? this.nomeNovoPerfil.trim() : '';
    return novo && !this.perfis.includes(novo) ? [...this.perfis, novo] : this.perfis;
  }

  contagem(perfil: string): number {
    return this.estado?.documento.perfis[perfil]?.length ?? 0;
  }

  protegido(perfil: string): boolean {
    return !!this.estado?.perfisProtegidos.includes(perfil);
  }

  carregar(): void {
    this.carregando = true;
    this.service.atual().subscribe({
      // preservarRascunho: a resposta pode chegar depois de a pessoa já ter começado a editar.
      next: e => {
        this.aplicarEstado(e, true);
        this.carregando = false;
        // Versão mais recente ilegível etc.: situação anormal, a pessoa precisa saber já ao abrir a tela.
        this.mostrarAvisos(e.avisos);
      },
      error: () => { this.carregando = false; },
    });
  }

  private aplicarEstado(e: EstadoRegras, preservarRascunho = false): void {
    if (preservarRascunho && this.sujo) {
      // Recarga tardia (depois de importar, ou de um 409): não pisa em quem já está editando.
      this.estado = e;
      this.historicoDesatualizado = true;
      this.seqHistorico++;
      this.versaoAberta = undefined;
      this.conflitoPendente = true;
      if (this.aba === 'historico') { this.carregarHistorico(); }
      return;
    }
    this.estado = e;
    this.conflitoPendente = false;
    this.limparResultado();
    this.historicoDesatualizado = true;
    this.seqHistorico++;
    this.versaoAberta = undefined;
    if (this.criandoPerfil) { return; }
    const existe = this.perfilSelecionado && e.documento.perfis[this.perfilSelecionado];
    this.perfilSelecionado = existe ? this.perfilSelecionado : (Object.keys(e.documento.perfis)[0] ?? null);
    this.carregarLinhas();
    if (this.aba === 'historico') { this.carregarHistorico(); }
  }

  selecionarAba(aba: Aba): void {
    // O resultado do simulador pode ter sido calculado com um rascunho que já mudou.
    if (aba !== this.aba) { this.limparResultado(); }
    this.aba = aba;
    if (aba === 'historico' && this.historicoDesatualizado) { this.carregarHistorico(); }
  }

  // ------------------------------------------------------------------ perfis e regras

  get sujo(): boolean {
    if (this.criandoPerfil) {
      // Qualquer coisa além da linha em branco padrão (URL, nota ou métodos diferentes de "get") é trabalho a perder.
      return !!this.nomeNovoPerfil.trim() || this.linhas.length !== 1 ||
        this.linhas.some(l => !!l.url.trim() || !!l.comentario.trim() || JSON.stringify(l.actions) !== '["get"]');
    }
    return JSON.stringify(this.linhasParaComparar()) !== this.linhasOriginais;
  }

  private linhasParaComparar(): unknown {
    return this.linhas.map(l => ({ url: l.url.trim(), actions: l.actions, comentario: l.comentario.trim() }));
  }

  private carregarLinhas(): void {
    this.conflitoPendente = false;
    this.limparResultado();
    const regras = (this.perfilSelecionado && this.estado?.documento.perfis[this.perfilSelecionado]) || [];
    this.linhas = regras.map(r => ({ url: r.url, actions: [...r.actions], comentario: r.comentario ?? '' }));
    this.linhasOriginais = JSON.stringify(this.linhasParaComparar());
  }

  async selecionar(perfil: string): Promise<void> {
    if (perfil === this.perfilSelecionado && !this.criandoPerfil) { return; }
    if (!(await this.podeDescartar())) { return; }
    this.criandoPerfil = false;
    this.perfilSelecionado = perfil;
    this.carregarLinhas();
  }

  async novoPerfil(): Promise<void> {
    if (!(await this.podeDescartar())) { return; }
    this.conflitoPendente = false;
    this.criandoPerfil = true;
    this.perfilSelecionado = null;
    this.nomeNovoPerfil = '';
    this.linhas = [this.linhaVazia()];
  }

  async descartar(): Promise<void> {
    if (!this.sujo || await this.podeDescartar()) {
      this.conflitoPendente = false;
      this.criandoPerfil = false;
      if (!this.perfilSelecionado) { this.perfilSelecionado = this.perfis[0] ?? null; }
      this.carregarLinhas();
    }
  }

  private async podeDescartar(): Promise<boolean> {
    if (!this.sujo) { return true; }
    const res = await this.alert.confirm('Há alterações não salvas. Descartar?');
    return res.isConfirmed;
  }

  /** Efetiva um descarte já confirmado: o recarregamento seguinte não deve tratar o rascunho velho como edição em curso. */
  private descartarRascunho(): void {
    this.criandoPerfil = false;
    this.nomeNovoPerfil = '';
    this.linhas = [];
    this.linhasOriginais = '[]';
    this.conflitoPendente = false;
  }

  private linhaVazia(): LinhaRegra {
    return { url: '', actions: ['get'], comentario: '' };
  }

  adicionarLinha(): void {
    this.linhas = [...this.linhas, this.linhaVazia()];
  }

  removerLinha(indice: number): void {
    this.linhas = this.linhas.filter((_, i) => i !== indice);
  }

  temAcao(linha: LinhaRegra, acao: string): boolean {
    return linha.actions.includes(acao);
  }

  /** O curinga (*) vale por todos os métodos: marcá-lo desmarca os outros e vice-versa. */
  alternarAcao(linha: LinhaRegra, acao: string): void {
    if (this.temAcao(linha, acao)) {
      linha.actions = linha.actions.filter(a => a !== acao);
    } else if (acao === '*') {
      linha.actions = ['*'];
    } else {
      linha.actions = [...linha.actions.filter(a => a !== '*'), acao];
    }
  }

  calcularCobertura(linha: LinhaRegra): void {
    const url = linha.url.trim();
    if (!url) { linha.cobertura = undefined; linha.coberturaDe = undefined; return; }
    if (linha.coberturaDe === url) { return; }
    this.service.cobertura(url).subscribe({
      next: lista => {
        // A linha pode ter mudado de URL enquanto a consulta voltava: só vale para a URL consultada.
        if (linha.url.trim() !== url) { return; }
        linha.cobertura = lista;
        linha.coberturaDe = url;
      },
      error: () => { if (linha.url.trim() === url) { linha.cobertura = undefined; } },
    });
  }

  /** A cobertura só vale para a URL para a qual foi calculada: digitou outra, a contagem antiga some até a nova chegar. */
  coberturaDe(linha: LinhaRegra): EndpointConhecido[] | undefined {
    return linha.coberturaDe === linha.url.trim() ? linha.cobertura : undefined;
  }

  textoCobertura(linha: LinhaRegra): string {
    return (linha.cobertura ?? []).slice(0, 15).map(e => `${e.metodo.toUpperCase()} ${e.url}`).join('\n');
  }

  private regrasDoRascunho(): RegraAcesso[] {
    return this.linhas.map(l => ({ url: l.url.trim(), actions: l.actions, comentario: l.comentario.trim() || null }));
  }

  private nomeEmEdicao(): string {
    return (this.criandoPerfil ? this.nomeNovoPerfil : this.perfilSelecionado ?? '').trim();
  }

  async salvarPerfil(): Promise<void> {
    if (!this.estado) { return; }
    const nome = this.nomeEmEdicao();
    if (!nome) {
      this.alert.error('Informe o nome do perfil.');
      return;
    }
    if (this.criandoPerfil && this.perfis.includes(nome)) {
      this.alert.error(`Já existe um perfil chamado "${nome}". Selecione-o na lista para editar.`);
      return;
    }
    if (!this.linhas.length || this.linhas.some(l => !l.url.trim() || !l.actions.length)) {
      this.alert.error('Toda regra precisa de uma URL e de pelo menos um método.');
      return;
    }
    if (this.conflitoPendente) {
      const existe = !this.criandoPerfil && !!this.estado.documento.perfis[nome];
      const seguir = await this.alert.confirm(
        'Outra pessoa alterou as regras desde que você começou a editar. Salvar agora grava o seu rascunho POR CIMA do que ' +
        (existe ? 'ela fez neste perfil' : 'está no servidor (este perfil não existe mais e será recriado)') + '. Continuar?');
      if (!seguir.isConfirmed) { return; }
    }
    const motivo = await this.pedirMotivo(
      'Quer registrar o motivo desta alteração? (opcional, fica no histórico)',
      'ex.: a cobrança precisa ver o nome do vendedor');
    if (!motivo.isConfirmed) { return; }

    await this.executar(
      this.service.salvarPerfil(nome, this.regrasDoRascunho(), this.estado.versao, String(motivo.value)),
      () => {
        this.criandoPerfil = false;
        this.perfilSelecionado = nome;
      });
  }

  async excluirPerfil(): Promise<void> {
    const perfil = this.perfilSelecionado;
    if (!this.estado || !perfil || this.criandoPerfil || this.protegido(perfil)) { return; }
    const motivo = await this.pedirMotivo(
      `Excluir o perfil "${perfil}"? Quem tiver só esse perfil passa a receber 403 (o menu continua mostrando as ` +
      `telas, porque ele lê os perfis do token). Motivo (opcional):`);
    if (!motivo.isConfirmed) { return; }

    await this.executar(
      this.service.removerPerfil(perfil, this.estado.versao, String(motivo.value)),
      () => { this.perfilSelecionado = null; });
  }

  // ------------------------------------------------------------------ testar acesso

  alternarPerfilNoTeste(perfil: string): void {
    this.teste.perfis = this.teste.perfis.includes(perfil)
      ? this.teste.perfis.filter(p => p !== perfil)
      : [...this.teste.perfis, perfil];
    this.limparResultado();
  }

  /** Aceita a URL colada do console do navegador: tira o host configurado (com o prefixo do gateway). */
  private caminhoDigitado(): string {
    let caminho = this.teste.caminho.trim();
    const host = this.config.getHost().replace(/\/+$/, '');
    // só corta se o host termina ali (fronteira de caminho): "https://x/base" não é prefixo de "https://x/base-extra"
    if (host && caminho.startsWith(host) && /^(?:$|[/?#])/.test(caminho.substring(host.length))) {
      caminho = caminho.substring(host.length);
    }
    return caminho;
  }

  private documentoComRascunho(): DocumentoRegras | undefined {
    if (!this.estado || !this.teste.usarRascunho || !this.sujo) { return undefined; }
    const nome = this.nomeEmEdicao();
    if (!nome) { return undefined; }
    return { perfis: { ...this.estado.documento.perfis, [nome]: this.regrasDoRascunho() } };
  }

  simular(): void {
    const caminho = this.caminhoDigitado();
    // Um perfil marcado pode ter deixado de existir (renomeado, descartado, excluído): só vale o que ainda está na lista.
    this.teste.perfis = this.teste.perfis.filter(p => this.perfisParaTeste.includes(p));
    if (!this.teste.perfis.length) {
      this.alert.error('Escolha pelo menos um perfil.');
      return;
    }
    if (!caminho) {
      this.alert.error('Informe o caminho (ou cole a URL do console).');
      return;
    }
    // Respostas fora de ordem: só vale a da última consulta.
    const seq = ++this.seqSimulacao;
    const metodo = this.teste.metodo;
    this.service.simular(this.teste.perfis, metodo, caminho, this.documentoComRascunho()).subscribe({
      next: r => {
        if (seq !== this.seqSimulacao) { return; }
        this.resultado = r;
        this.resultadoMetodo = metodo;
      },
      error: () => { if (seq === this.seqSimulacao) { this.resultado = undefined; } },
    });
  }

  /** Texto do rodapé do resultado: qual versão do cadastro foi simulada e se ela já está valendo. */
  get rodapeDoResultado(): string {
    const r = this.resultado;
    if (!r) { return ''; }
    if (r.versaoSimulada == null) { return 'Simulado com o rascunho que está na tela (não salvo).'; }
    return r.valendo
      ? `Simulado com a versão ${r.versaoSimulada} do cadastro, que já está valendo neste backend.`
      : `Simulado com a versão ${r.versaoSimulada} do cadastro, que AINDA NÃO está valendo neste backend ` +
        `(o filtro usa outra fonte ou outra versão): o acesso real pode ser diferente.`;
  }

  /** Mudou método, caminho ou perfis: o resultado na tela já não responde ao que está no formulário. */
  limparResultado(): void {
    this.seqSimulacao++;
    this.resultado = undefined;
  }

  // ------------------------------------------------------------------ histórico

  carregarHistorico(): void {
    const seq = ++this.seqHistorico;
    this.service.versoes().subscribe({
      next: v => {
        // Uma resposta anterior a uma gravação não pode marcar o histórico como atualizado.
        if (seq !== this.seqHistorico) { return; }
        this.versoes = v;
        this.historicoDesatualizado = false;
      },
    });
  }

  verMudancas(v: VersaoResumo): void {
    if (this.versaoAberta?.resumo.versao === v.versao) {
      this.versaoAberta = undefined;
      return;
    }
    this.service.versao(v.versao).subscribe({ next: r => this.versaoAberta = r });
  }

  async restaurar(v: VersaoResumo): Promise<void> {
    if (!this.estado || v.versao === this.estado.versao) { return; }
    if (!(await this.podeDescartar())) { return; }
    const res = await this.alert.confirm(
      `Restaurar as regras da versão ${v.versao}? Isso cria uma versão nova igual a ela; nada do histórico é apagado.`);
    if (!res.isConfirmed) { return; }
    await this.executar(
      this.service.restaurar(v.versao, this.estado.versao, `Restaurada a versão ${v.versao}`),
      () => { this.criandoPerfil = false; });
  }

  // ------------------------------------------------------------------ importar / exportar

  invalidarPrevia(): void {
    this.previa = undefined;
  }

  lerArquivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    if (!arquivo) { return; }
    const antes = this.yaml;
    arquivo.text().then(texto => {
      entrada.value = '';
      // Se a pessoa começou a digitar enquanto o arquivo era lido, não pisa no que ela escreveu.
      if (this.yaml !== antes) { return; }
      this.yaml = texto;
      this.invalidarPrevia();
    });
  }

  carregarArquivoDoServidor(): void {
    const antes = this.yaml;
    this.service.arquivo().subscribe({
      next: texto => {
        if (this.yaml !== antes) { return; }
        this.yaml = texto;
        this.invalidarPrevia();
      },
    });
  }

  previsualizar(): void {
    if (!this.yaml.trim()) {
      this.alert.error('Cole o YAML ou escolha um arquivo.');
      return;
    }
    // Uma resposta atrasada não pode reaparecer se o YAML ou o modo já mudaram (o "Aplicar" enviaria outro texto).
    const yaml = this.yaml;
    const modo = this.modo;
    this.service.importar(yaml, modo, true).subscribe({
      next: p => { if (this.yaml === yaml && this.modo === modo) { this.previa = p; } },
    });
  }

  get podeAplicar(): boolean {
    return !!this.previa && !this.previa.erros.length && this.previa.temMudanca;
  }

  async aplicarImportacao(): Promise<void> {
    if (!this.previa || !this.podeAplicar) { return; }
    // Aplicar recarrega o cadastro inteiro: um rascunho de perfil em edição seria perdido.
    if (!(await this.podeDescartar())) { return; }
    const motivo = await this.pedirMotivo(
      `Aplicar a importação (${this.modo}) como uma versão nova das regras? Motivo (opcional):`);
    if (!motivo.isConfirmed) { return; }

    const versaoBase = this.previa.versaoAtual;
    try {
      const gravada = await this.alert.loading(lastValueFrom(
        this.service.importar(this.yaml, this.modo, false, versaoBase, String(motivo.value))));
      this.yaml = '';
      this.previa = undefined;
      this.descartarRascunho();
      this.carregar();
      this.mostrarAvisos(gravada.avisosKeycloak);
    } catch (erro) {
      this.aoFalhar(erro);
    }
  }

  baixarAtual(): void {
    this.service.exportar().subscribe({ next: t => this.baixar(t, 'rules.yml') });
  }

  baixarVersao(v: VersaoResumo): void {
    this.service.exportar(v.versao).subscribe({ next: t => this.baixar(t, `rules-v${v.versao}.yml`) });
  }

  baixarArquivoDoServidor(): void {
    this.service.arquivo().subscribe({ next: t => this.baixar(t, 'rules-servidor.yml') });
  }

  private baixar(texto: string, nome: string): void {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/yaml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------------ comum

  /**
   * Grava, mostra o overlay "Carregando..." durante o round-trip com o SAP e aplica o estado que o
   * backend devolveu. O erro já é exibido pelo ErrorInterceptor; num conflito (409) a tela recarrega
   * para mostrar o que a outra pessoa gravou.
   */
  /**
   * Pede o motivo da alteração, mas não obriga: o histórico já guarda quem, quando e o resumo do que mudou.
   * (O confirmWithInput padrão exige texto; o preConfirm abaixo aceita vazio.)
   */
  private pedirMotivo(texto: string, placeholder = 'opcional') {
    return this.alert.confirmWithInput(texto, 'text', {
      inputPlaceholder: placeholder,
      preConfirm: (valor: unknown) => String(valor ?? '').trim() as any,
    });
  }

  private async executar(obs: Observable<EstadoRegras>, aposSalvar: () => void): Promise<void> {
    try {
      const novo = await this.alert.loading(lastValueFrom(obs));
      aposSalvar();
      this.aplicarEstado(novo);
      this.mostrarAvisos(novo.avisos);
    } catch (erro) {
      this.aoFalhar(erro);
    }
  }

  /** O que ficou por fazer no Keycloak (a gravação no SAP já deu certo). */
  private mostrarAvisos(avisos?: string[]): void {
    // O SweetAlert mostra texto puro e colapsa quebras de linha; marcadores deixam cada aviso distinguivel (sem HTML).
    if (avisos?.length) { this.alert.info(avisos.map(a => '• ' + a).join('   ')); }
  }

  /** Texto sob o nome do perfil novo: o que acontece com a role no Keycloak. */
  get avisoKeycloakNovoPerfil(): string {
    if (!this.estado?.keycloakLigado) { return ''; }
    return this.estado.keycloakCriaRoles
      ? 'Ao salvar, a role com este nome também é criada no Keycloak.'
      : 'Depois de salvar, crie no Keycloak uma role com este nome exato para poder atribuí-la a usuários.';
  }

  private aoFalhar(erro: unknown): void {
    if ((erro as { status?: number })?.status !== 409) { return; }
    if (!this.sujo) {
      this.carregar();
      return;
    }
    // Há um rascunho: atualiza só a versão/cadastro de referência e mantém o que a pessoa digitou.
    this.service.atual().subscribe({
      next: e => {
        this.estado = e;
        this.historicoDesatualizado = true;
        this.versaoAberta = undefined;
        this.conflitoPendente = true;
      },
    });
  }

  classeOrigem(origem?: string): string {
    switch (origem) {
      case 'SEED': return 'badge-secondary';
      case 'IMPORTACAO': return 'badge-info';
      case 'RESTAURACAO': return 'badge-warning';
      default: return 'badge-primary';
    }
  }
}
