import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { ToastrService } from 'ngx-toastr';
import {
  EventoAuditoria,
  ExemploRelatorio,
  FormatoRelatorio,
  Problema,
  ProblemasPorCaminho,
  RelatorioAdmin,
  RelatorioAdminDetalhe,
  ValidacaoFalha,
  Parametro,
  ValidacaoOk,
  Versao,
} from '../../modelos/relatorio.model';
import { FormularioParametrosComponent } from '../formulario-parametros/formulario-parametros.component';
import { RelatorioService } from '../../../../sap/service/relatorio.service';
import { EditorCodigoComponent, MarcadorEditor } from '../editor-codigo/editor-codigo.component';
import { NgxDropzoneCompatComponent } from '../upload/ngx-dropzone-compat.component';
import { RELATORIO_SCAFFOLD_TEMPLATE, RELATORIO_SCAFFOLD_YAML } from '../../modelos/scaffold';
import * as yaml from 'js-yaml';
import { Subscription } from 'rxjs';

type ArquivoRelatorio = 'yaml' | 'sql' | 'template';

interface BlocoSqlYaml {
  inicioConteudo: number;
  fimConteudo: number;
  indentacaoConteudo: string;
}

@Component({
  selector: 'app-relatorio-autoria',
  templateUrl: './relatorio-autoria.component.html',
  styleUrls: ['./relatorio-autoria.component.scss'],
})
export class RelatorioAutoriaComponent implements OnInit, OnChanges, OnDestroy {
  @Input() relatorioEdicaoId?: number;
  @ViewChild('definicaoDropzone') definicaoDropzone?: NgxDropzoneCompatComponent;
  @ViewChild('templateDropzone') templateDropzone?: NgxDropzoneCompatComponent;
  @ViewChild('editorCodigo') editorCodigo?: EditorCodigoComponent;
  @ViewChild('previewHtmlModal') previewHtmlModal?: TemplateRef<void>;
  @ViewChild('confirmacaoModal') confirmacaoModal?: TemplateRef<void>;
  @ViewChild('formPreview') formPreview?: FormularioParametrosComponent;

  selecionado?: RelatorioAdmin;
  detalhe?: RelatorioAdminDetalhe;
  versoes: Versao[] = [];
  auditoria: EventoAuditoria[] = [];
  modoNovo = true;
  paginaVersoes = 1;
  paginaAuditoria = 1;

  carregandoDetalhe = false;
  carregandoVersoes = false;
  carregandoAuditoria = false;
  validando = false;
  salvando = false;
  previsualizando = false;
  publicando = false;
  executandoAcao = false;

  erroDetalhe = '';
  erroVersoes = '';
  erroAuditoria = '';
  erroPreview = '';

  definicaoArquivo?: File;
  templateArquivo?: File;
  definicaoTexto = '';
  templateTexto = '';
  sqlTexto = '';
  arquivoSelecionado: ArquivoRelatorio = 'yaml';
  sqlConversaoNecessaria = false;
  avisoSql = '';
  marcadoresYaml: MarcadorEditor[] = [];
  marcadoresSql: MarcadorEditor[] = [];
  marcadoresTemplate: MarcadorEditor[] = [];
  problemas: Problema[] = [];
  validacaoOk?: ValidacaoOk;

  previewFormato?: FormatoRelatorio;
  previewVersao?: number;
  previewParams = '{}';
  erroJsonPreview = '';
  private parametrosPreviewCache: { texto: string; lista: Parametro[] } = { texto: '', lista: [] };
  versaoPublicacao?: number;
  versaoPrevisualizada?: number;
  relatorioPrevisualizado?: number;
  previewHtmlSeguro?: SafeResourceUrl;

  tituloConfirmacao = '';
  textoConfirmacao = '';

  private previewObjectUrl?: string;
  modalRef?: BsModalRef;
  private acaoConfirmada?: () => void;
  private consultaPreview?: Subscription;

  /** Exemplos do backend; o "modelo basico" (scaffold) e local e vem sempre primeiro. */
  exemplos: ExemploRelatorio[] = [];
  readonly MODELO_BASICO = '__modelo_basico__';
  /** Conteudo como foi carregado/salvo, para saber se ha alteracao a perder. */
  private base = { definicao: '', template: '' };

  constructor(
    private service: RelatorioService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer,
    private modalService: BsModalService
  ) {}

  ngOnInit(): void {
    this.service.listarExemplos().subscribe({
      next: (exemplos) => (this.exemplos = exemplos || []),
      // Sem a lista, ainda sobra o modelo basico: nao vale bloquear a tela.
      error: () => (this.exemplos = []),
    });
    if (this.relatorioEdicaoId) {
      this.carregarEdicao(this.relatorioEdicaoId);
    } else {
      this.novo();
    }
  }

  ngOnChanges(_: SimpleChanges): void {
    // A troca entre editar e criar e comandada pelo pai via abrirEdicao()/novo().
    // Depender da mudanca do @Input falhava: editar o MESMO relatorio duas vezes
    // nao muda o valor, o ngOnChanges nao dispara e a tela ficava presa.
  }

  /** Chamado pelo pai ao clicar "Editar" na aba Executar. Sempre recarrega. */
  abrirEdicao(id: number): void {
    this.carregarEdicao(id);
  }

  /** true quando ha um relatorio existente carregado para edicao. */
  get emEdicao(): boolean {
    return !this.modoNovo;
  }

  ngOnDestroy(): void {
    this.invalidarPreview();
    this.modalRef?.hide();
    this.limparPreviewHtml();
  }

  /** Pai escuta para esquecer o id em edicao - senao o proximo "Editar" desse
   *  mesmo relatorio nao teria efeito. */
  @Output() novoIniciado = new EventEmitter<void>();

  /**
   * Carrega um exemplo no editor como relatorio NOVO. Em cima de um relatorio
   * existente o exemplo viraria uma nova versao dele ao salvar - quase nunca e o
   * que se quer.
   */
  carregarExemplo(id: string): void {
    const exemplo = id === this.MODELO_BASICO
      ? { nome: 'Modelo básico', definicao: RELATORIO_SCAFFOLD_YAML, template: RELATORIO_SCAFFOLD_TEMPLATE }
      : this.exemplos.find((item) => item.id === id);
    if (!exemplo) return;

    const aplicar = () => {
      this.novo();
      this.definicaoTexto = exemplo.definicao;
      this.templateTexto = exemplo.template;
      this.sincronizarSqlDoYaml();
      this.limparValidacao();
      this.marcarComoCarregado();
      this.novoIniciado.emit();
      this.toastr.info(`Exemplo "${exemplo.nome}" carregado como novo relatório. Ajuste e grave.`);
    };
    if (this.temAlteracoes || !this.modoNovo) {
      this.confirmar(
        'Carregar exemplo',
        `Isso abre "${exemplo.nome}" como um relatório novo` +
          (this.temAlteracoes ? ' e descarta as alterações não gravadas no editor.' : '.'),
        aplicar,
      );
    } else {
      aplicar();
    }
  }

  get temAlteracoes(): boolean {
    return this.definicaoTexto !== this.base.definicao || this.templateTexto !== this.base.template;
  }

  private marcarComoCarregado(): void {
    this.base = { definicao: this.definicaoTexto, template: this.templateTexto };
  }

  /** Botao "Novo relatorio" do cabecalho. */
  iniciarNovo(): void {
    this.novo();
    this.novoIniciado.emit();
  }

  novo(): void {
    this.modoNovo = true;
    this.selecionado = undefined;
    this.detalhe = undefined;
    this.versoes = [];
    this.auditoria = [];
    this.previewVersao = undefined;
    this.versaoPublicacao = undefined;
    this.resetarArquivos(true);
    this.invalidarPreview();
  }

  selecionar(relatorio: RelatorioAdmin): void {
    this.modoNovo = false;
    this.selecionado = relatorio;
    this.previewVersao = relatorio.ultimaVersao;
    this.versaoPublicacao = relatorio.ultimaVersao;
    this.previewFormato = relatorio.formatos?.includes('html') ? 'html' : relatorio.formatos?.[0];
    this.resetarArquivos();
    this.invalidarPreview();
    this.carregarDetalhe();
    this.carregarVersoes();
    this.carregarAuditoria();
  }

  private carregarEdicao(id: number): void {
    this.invalidarPreview();
    this.modoNovo = false;
    this.selecionado = undefined;
    this.detalhe = undefined;
    this.versoes = [];
    this.auditoria = [];
    this.carregandoDetalhe = true;
    this.erroDetalhe = '';
    this.resetarArquivos();
    this.service.obterAdmin(id).subscribe({
      next: (detalhe) => {
        if (this.relatorioEdicaoId !== id) {
          return;
        }
        this.selecionado = detalhe;
        this.detalhe = detalhe;
        this.definicaoTexto = detalhe.definicao || '';
        this.templateTexto = detalhe.template || '';
        this.marcarComoCarregado();
        this.previewVersao = detalhe.ultimaVersao;
        this.versaoPublicacao = detalhe.ultimaVersao;
        this.previewFormato = detalhe.formatos?.includes('html') ? 'html' : detalhe.formatos?.[0];
        this.sincronizarSqlDoYaml();
        this.limparValidacao();
        this.carregandoDetalhe = false;
        this.carregarVersoes();
        this.carregarAuditoria();
      },
      error: async (error) => {
        if (this.relatorioEdicaoId !== id) {
          return;
        }
        const retorno = await this.service.lerErro(error);
        this.erroDetalhe = retorno?.mensagem || 'Não foi possível carregar o relatório para edição.';
        this.carregandoDetalhe = false;
        this.toastr.error(this.erroDetalhe);
      },
    });
  }

  carregarDetalhe(versao?: number): void {
    if (!this.selecionado) {
      return;
    }
    this.carregandoDetalhe = true;
    this.erroDetalhe = '';
    this.service.obterAdmin(this.selecionado.id, versao).subscribe({
      next: (detalhe) => {
        this.detalhe = detalhe;
        if (versao == null) {
          this.definicaoTexto = detalhe.definicao || '';
          this.templateTexto = detalhe.template || '';
          this.marcarComoCarregado();
          this.sincronizarSqlDoYaml();
          this.limparValidacao();
        }
        this.carregandoDetalhe = false;
      },
      error: async (error) => {
        const retorno = await this.service.lerErro(error);
        this.erroDetalhe = retorno?.mensagem || 'Não foi possível carregar a fonte da versão.';
        this.carregandoDetalhe = false;
      },
    });
  }

  carregarVersoes(): void {
    if (!this.selecionado) {
      return;
    }
    this.carregandoVersoes = true;
    this.erroVersoes = '';
    this.service.listarVersoes(this.selecionado.id).subscribe({
      next: (versoes) => {
        this.versoes = versoes || [];
        this.carregandoVersoes = false;
      },
      error: async (error) => {
        const retorno = await this.service.lerErro(error);
        this.erroVersoes = retorno?.mensagem || 'Não foi possível carregar o histórico de versões.';
        this.carregandoVersoes = false;
      },
    });
  }

  carregarAuditoria(): void {
    if (!this.selecionado) {
      return;
    }
    this.carregandoAuditoria = true;
    this.erroAuditoria = '';
    this.service.listarAuditoria(this.selecionado.id).subscribe({
      next: (eventos) => {
        this.auditoria = eventos || [];
        this.carregandoAuditoria = false;
      },
      error: async (error) => {
        const retorno = await this.service.lerErro(error);
        this.erroAuditoria = retorno?.mensagem || 'Não foi possível carregar a auditoria.';
        this.carregandoAuditoria = false;
      },
    });
  }

  onDefinicaoAdicionada(file: File): void {
    if (!this.extensaoValida(file, '.yaml')) {
      this.toastr.error('A definição deve ser um arquivo .yaml.');
      this.definicaoDropzone?.resetar();
      return;
    }
    this.definicaoArquivo = file;
    this.lerArquivo(file, (texto) => this.atualizarDefinicao(texto));
    this.limparValidacao();
  }

  onTemplateAdicionado(file: File): void {
    if (!this.extensaoValida(file, '.hbs')) {
      this.toastr.error('O template deve ser um arquivo .hbs.');
      this.templateDropzone?.resetar();
      return;
    }
    this.templateArquivo = file;
    this.lerArquivo(file, (texto) => this.templateTexto = texto);
    this.limparValidacao();
  }

  onDefinicaoRemovida(file: File): void {
    if (this.definicaoArquivo === file) {
      this.definicaoArquivo = undefined;
      this.atualizarDefinicao('');
      this.limparValidacao();
    }
  }

  onTemplateRemovido(file: File): void {
    if (this.templateArquivo === file) {
      this.templateArquivo = undefined;
      this.templateTexto = '';
      this.limparValidacao();
    }
  }

  onDropzoneErro(evento: unknown): void {
    const partes = Array.isArray(evento) ? evento : [];
    const mensagem = typeof evento === 'string'
      ? evento
      : (typeof partes[1] === 'string' ? partes[1] : 'O arquivo não pôde ser selecionado.');
    this.toastr.error(mensagem);
  }

  onDefinicaoAlterada(valor: string): void {
    this.definicaoTexto = valor;
    this.sincronizarSqlDoYaml();
    this.limparValidacao();
  }

  get valorEditor(): string {
    if (this.arquivoSelecionado === 'sql') {
      return this.sqlTexto;
    }
    return this.arquivoSelecionado === 'template' ? this.templateTexto : this.definicaoTexto;
  }

  /**
   * O nome vive no YAML, mas editar YAML para batizar um relatorio e um
   * pessimo primeiro contato. O id nao: e gerado pelo banco ao salvar.
   *
   * Estes campos leem e escrevem direto no texto do YAML, mantendo-o como fonte
   * unica da verdade.
   */
  get nomeRelatorio(): string {
    return this.campoDoYaml('nome');
  }

  set nomeRelatorio(valor: string) {
    this.escreverCampoNoYaml('nome', valor);
  }

  /** Le um campo escalar do topo do YAML. */
  private campoDoYaml(campo: string): string {
    try {
      const documento = yaml.load(this.definicaoTexto) as Record<string, unknown>;
      return typeof documento?.[campo] === 'string' ? documento[campo] as string : '';
    } catch {
      return '';
    }
  }

  /** Escreve preservando o resto do arquivo - nada de round-trip de YAML. */
  private escreverCampoNoYaml(campo: string, valor: string): void {
    const regex = new RegExp(`^(${campo}[ \\t]*:[ \\t]*).*$`, 'm');
    const escalar = JSON.stringify(valor);
    this.definicaoTexto = regex.test(this.definicaoTexto)
      ? this.definicaoTexto.replace(regex, () => `${campo}: ${escalar}`)
      : `${campo}: ${escalar}\n${this.definicaoTexto}`;
    this.limparValidacao();
  }

  get modoEditor(): 'yaml' | 'sql' | 'handlebars' {
    // `handlebars`, nao `htmlmixed`: o segundo realca o HTML mas deixa as
    // expressoes {{ }} sem cor, que e justamente o que se edita aqui.
    return this.arquivoSelecionado === 'template' ? 'handlebars' : this.arquivoSelecionado;
  }

  get marcadoresEditor(): MarcadorEditor[] {
    if (this.arquivoSelecionado === 'sql') {
      return this.marcadoresSql;
    }
    return this.arquivoSelecionado === 'template' ? this.marcadoresTemplate : this.marcadoresYaml;
  }

  get nomeRaiz(): string {
    return this.nomeRelatorio || (this.selecionado ? `relatorio-${this.selecionado.id}` : 'novo-relatorio');
  }

  selecionarArquivo(arquivo: ArquivoRelatorio): void {
    if (arquivo === 'sql') {
      this.sincronizarSqlDoYaml();
    }
    this.arquivoSelecionado = arquivo;
    requestAnimationFrame(() => this.editorCodigo?.atualizarTamanho());
  }

  onEditorAlterado(valor: string): void {
    if (this.arquivoSelecionado === 'sql') {
      this.onSqlAlterado(valor);
    } else if (this.arquivoSelecionado === 'template') {
      this.templateTexto = valor;
      this.limparValidacao();
    } else {
      this.onDefinicaoAlterada(valor);
    }
  }

  onSqlAlterado(valor: string): void {
    this.sqlTexto = valor;
    const bloco = this.localizarBlocoSql(this.definicaoTexto);
    if (!bloco) {
      this.sqlConversaoNecessaria = true;
      this.avisoSql = 'consulta.sql não está em um bloco YAML que possa ser editado com segurança.';
      return;
    }

    const linhas = this.definicaoTexto.split(/\r?\n/);
    const linhasSql = valor.split('\n').map((linha) => `${bloco.indentacaoConteudo}${linha}`);
    linhas.splice(bloco.inicioConteudo, bloco.fimConteudo - bloco.inicioConteudo, ...linhasSql);
    this.definicaoTexto = linhas.join('\n');
    this.sincronizarSqlDoYaml();
    this.limparValidacao();
  }

  converterSqlParaBloco(): void {
    try {
      const documento = yaml.load(this.definicaoTexto) as any;
      if (!documento || typeof documento !== 'object'
        || !documento.consulta || typeof documento.consulta !== 'object'
        || typeof documento.consulta.sql !== 'string') {
        this.toastr.error('Não foi possível encontrar consulta.sql como texto no YAML.');
        return;
      }
      const sql = documento.consulta.sql;
      documento.consulta.sql = sql.endsWith('\n') ? sql : `${sql}\n`;
      this.definicaoTexto = yaml.dump(documento, { lineWidth: -1, noRefs: true });
      this.sincronizarSqlDoYaml();
      this.limparValidacao();
      this.toastr.success('consulta.sql foi convertida para bloco. Os comentários do YAML foram removidos.');
    } catch {
      this.toastr.error('O YAML precisa estar válido para converter consulta.sql para bloco.');
    }
  }

  irParaProblema(problema: Problema): void {
    if (problema.linha == null) {
      return;
    }
    const bloco = this.localizarBlocoSql(this.definicaoTexto);
    if (bloco
      && problema.caminho.startsWith('consulta.sql')
      && problema.linha > bloco.inicioConteudo
      && problema.linha <= bloco.fimConteudo) {
      this.selecionarArquivo('sql');
      requestAnimationFrame(() => this.editorCodigo?.irParaLinha((problema.linha as number) - bloco.inicioConteudo));
      return;
    }
    this.selecionarArquivo(problema.caminho.startsWith('template') ? 'template' : 'yaml');
    requestAnimationFrame(() => this.editorCodigo?.irParaLinha(problema.linha as number));
  }

  validar(): void {
    if (!this.conteudosProntos()) {
      return;
    }
    this.validando = true;
    this.limparValidacao();
    this.service.validar({
      definicao: this.definicaoTexto,
      template: this.templateTexto,
    }).subscribe({
      next: (resultado) => {
        this.validacaoOk = resultado;
        this.validando = false;
        this.toastr.success('Definição e template válidos. Nada foi gravado.');
      },
      error: async (error: HttpErrorResponse) => {
        await this.tratarErroValidacao(error, 'Não foi possível validar os arquivos.');
        this.validando = false;
      },
    });
  }

  salvar(): void {
    if (!this.conteudosProntos() || (!this.modoNovo && !this.selecionado)) {
      return;
    }
    if (!this.validacaoOk) {
      this.toastr.warning('Valide a definição antes de salvar.');
      return;
    }
    this.salvando = true;
    const request = {
      definicao: this.definicaoTexto,
      template: this.templateTexto,
    };
    const operacao = this.modoNovo
      ? this.service.criar(request)
      : this.service.criarVersao(this.selecionado!.id, request);

    operacao.subscribe({
      next: (relatorio) => {
        this.salvando = false;
        this.toastr.success(this.modoNovo ? 'Rascunho criado na versão 1.' : 'Nova versão criada como rascunho.');
        this.selecionar(relatorio);
      },
      error: async (error: HttpErrorResponse) => {
        await this.tratarErroValidacao(error, 'Não foi possível enviar os arquivos.');
        this.salvando = false;
      },
    });
  }

  erroSalvar = '';

  previsualizar(): void {
    if (!this.selecionado || !this.previewVersao || !this.previewFormato) {
      return;
    }
    let params: Record<string, unknown>;
    try {
      const valor = JSON.parse(this.previewParams);
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
        throw new Error();
      }
      params = valor as Record<string, unknown>;
    } catch {
      this.erroPreview = 'Informe os parâmetros como um objeto JSON válido.';
      this.toastr.warning(this.erroPreview);
      return;
    }

    this.invalidarPreview();
    const id = this.selecionado.id;
    const versao = this.previewVersao;
    const formato = this.previewFormato;
    this.previsualizando = true;
    this.erroPreview = '';
    this.consultaPreview = this.service.preview(
      id,
      formato,
      { params },
      versao
    ).subscribe({
      next: (response) => {
        this.versaoPrevisualizada = versao;
        this.relatorioPrevisualizado = id;
        if (formato === 'html') {
          this.abrirPreviewHtml(response);
        } else {
          this.baixar(response, `${id}-preview.${formato}`);
          this.toastr.success('Prévia gerada com sucesso.');
        }
        this.previsualizando = false;
      },
      error: async (error: HttpErrorResponse) => {
        const detalhe = await this.service.lerErro(error);
        if (this.selecionado?.id !== id || this.previewVersao !== versao || this.previewFormato !== formato) return;
        this.invalidarPreview();
        if (error.status === 422) {
          this.erroPreview = detalhe?.mensagem || 'O resultado excedeu o limite. Restrinja os filtros.';
        } else {
          this.erroPreview = detalhe?.mensagem || 'Não foi possível gerar a prévia.';
        }
        this.previsualizando = false;
        this.toastr.error(this.erroPreview);
      },
    });
  }

  publicar(): void {
    if (!this.selecionado || !this.versaoPublicacao || !this.podePublicar) {
      return;
    }
    this.publicando = true;
    this.service.publicar(this.selecionado.id, this.versaoPublicacao).subscribe({
      next: (relatorio) => {
        this.publicando = false;
        this.toastr.success(`Versão ${this.versaoPublicacao} publicada.`);
        this.atualizarSelecionado(relatorio);
      },
      error: async (error) => {
        const detalhe = await this.service.lerErro(error);
        this.publicando = false;
        this.toastr.error(detalhe?.mensagem || 'Não foi possível publicar a versão.');
      },
    });
  }

  solicitarRollback(versao: Versao): void {
    if (!this.selecionado || versao.publicada) {
      return;
    }
    this.confirmar(
      'Confirmar rollback',
      `A versão publicada passará a ser a versão ${versao.versao}. Nenhuma versão será apagada.`,
      () => this.executarRollback(versao.versao)
    );
  }

  solicitarRemocao(): void {
    if (!this.selecionado) {
      return;
    }
    const id = this.selecionado.id;
    this.confirmar(
      'Remover relatório',
      `O relatório ${id} e todas as suas versões serão removidos.`,
      () => this.executarRemocao(id)
    );
  }

  confirmarAcao(): void {
    const acao = this.acaoConfirmada;
    this.modalRef?.hide();
    this.acaoConfirmada = undefined;
    acao?.();
  }

  cancelarConfirmacao(): void {
    this.modalRef?.hide();
    this.acaoConfirmada = undefined;
  }

  /** Parâmetros declarados na definição em edição; memoizado para não recriar o formulário a cada ciclo. */
  get parametrosPreview(): Parametro[] {
    if (this.parametrosPreviewCache.texto !== this.definicaoTexto) {
      let lista = this.parametrosPreviewCache.lista;
      try {
        const documento = yaml.load(this.definicaoTexto) as { parametros?: unknown } | null;
        const lidos = Array.isArray(documento?.parametros)
          ? (documento!.parametros as Parametro[]).filter((p) => p && typeof p.nome === 'string')
          : [];
        // So troca a referencia se os PARAMETROS mudaram. Editar o nome (ou o SQL)
        // tambem muda o texto do YAML, e uma lista nova remontava o formulario da
        // previa a cada tecla, apagando os valores preenchidos.
        if (JSON.stringify(lidos) !== JSON.stringify(lista)) lista = lidos;
      } catch {
        // YAML inválido durante a digitação: mantém o último formulário válido.
      }
      this.parametrosPreviewCache = { texto: this.definicaoTexto, lista };
    }
    return this.parametrosPreviewCache.lista;
  }

  onFormPreviewChange(valores: Record<string, unknown>): void {
    const texto = JSON.stringify(valores, null, 2);
    if (texto === this.previewParams) return;
    this.previewParams = texto;
    this.erroJsonPreview = '';
    this.invalidarPreview();
  }

  onJsonPreviewChange(texto: string): void {
    this.previewParams = texto;
    this.invalidarPreview();
    try {
      const valor = JSON.parse(texto);
      if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
        this.erroJsonPreview = 'O JSON precisa ser um objeto.';
        return;
      }
      this.erroJsonPreview = '';
      this.formPreview?.aplicarValores(valor as Record<string, unknown>);
    } catch {
      this.erroJsonPreview = 'JSON inválido — o formulário será atualizado quando o JSON for válido.';
    }
  }

  invalidarPreview(): void {
    this.consultaPreview?.unsubscribe();
    this.consultaPreview = undefined;
    this.previsualizando = false;
    this.versaoPrevisualizada = undefined;
    this.relatorioPrevisualizado = undefined;
    this.erroPreview = '';
  }

  get podePublicar(): boolean {
    return !!this.selecionado
      && this.relatorioPrevisualizado === this.selecionado.id
      && this.versaoPrevisualizada === this.versaoPublicacao;
  }

  get formatosDisponiveis(): FormatoRelatorio[] {
    return this.selecionado?.formatos || [];
  }

  get problemasAgrupados(): ProblemasPorCaminho[] {
    const grupos = new Map<string, Problema[]>();
    this.problemas.forEach((problema) => {
      const grupo = grupos.get(problema.caminho) || [];
      grupo.push(problema);
      grupos.set(problema.caminho, grupo);
    });
    return Array.from(grupos.entries()).map(([caminho, problemas]) => ({ caminho, problemas }));
  }

  identificarGrupo(_: number, grupo: ProblemasPorCaminho): string {
    return grupo.caminho;
  }

  identificarVersao(_: number, versao: Versao): number {
    return versao.versao;
  }

  acaoEmPortugues(evento: EventoAuditoria): string {
    const rotulos: Record<EventoAuditoria['acao'], string> = {
      CRIOU: 'Criou',
      NOVA_VERSAO: 'Criou nova versão',
      PUBLICOU: 'Publicou',
      ROLLBACK: 'Fez rollback',
      REMOVEU: 'Removeu',
    };
    return rotulos[evento.acao];
  }

  quantidadeErros(arquivo: ArquivoRelatorio): number {
    return this.problemas.filter((problema) => {
      if (arquivo === 'template') {
        return problema.caminho.startsWith('template');
      }
      if (arquivo === 'sql') {
        return problema.caminho.startsWith('consulta.sql');
      }
      return !problema.caminho.startsWith('template') && !problema.caminho.startsWith('consulta.sql');
    }).length;
  }

  private conteudosProntos(): boolean {
    if (!this.definicaoTexto.trim() || !this.templateTexto.trim()) {
      this.toastr.warning('Informe a definição YAML e o template Handlebars.');
      return false;
    }
    return true;
  }

  private extensaoValida(file: File, extensao: string): boolean {
    return !!file?.name && file.name.toLowerCase().endsWith(extensao);
  }

  private lerArquivo(file: File, concluir: (texto: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => concluir(String(reader.result || ''));
    reader.onerror = () => this.toastr.error(`Não foi possível ler ${file.name}.`);
    reader.readAsText(file);
  }

  private limparValidacao(): void {
    this.erroSalvar = '';
    this.problemas = [];
    this.validacaoOk = undefined;
    this.marcadoresYaml = [];
    this.marcadoresSql = [];
    this.marcadoresTemplate = [];
  }

  private resetarArquivos(comScaffold = false): void {
    this.definicaoArquivo = undefined;
    this.templateArquivo = undefined;
    this.definicaoTexto = comScaffold ? RELATORIO_SCAFFOLD_YAML : '';
    this.templateTexto = comScaffold ? RELATORIO_SCAFFOLD_TEMPLATE : '';
    this.marcarComoCarregado();
    this.arquivoSelecionado = 'yaml';
    this.sincronizarSqlDoYaml();
    this.limparValidacao();
    this.definicaoDropzone?.resetar();
    this.templateDropzone?.resetar();
  }

  private async tratarErroValidacao(error: HttpErrorResponse, fallback: string): Promise<void> {
    const retorno = await this.service.lerErro(error);
    if (error.status === 422 && retorno?.erro === 'validacao_falhou' && 'problemas' in retorno) {
      const falha = retorno as ValidacaoFalha;
      this.problemas = falha.problemas || [];
      this.atualizarMarcadores();
      this.toastr.error(`${this.problemas.length} problema(s) de validação encontrado(s).`);
      return;
    }
    this.toastr.error(retorno?.mensagem || fallback);
  }

  private executarRollback(versao: number): void {
    if (!this.selecionado) {
      return;
    }
    this.executandoAcao = true;
    this.service.rollback(this.selecionado.id, versao).subscribe({
      next: (relatorio) => {
        this.executandoAcao = false;
        this.toastr.success(`Rollback para a versão ${versao} concluído.`);
        this.atualizarSelecionado(relatorio);
      },
      error: async (error) => {
        const detalhe = await this.service.lerErro(error);
        this.executandoAcao = false;
        this.toastr.error(detalhe?.mensagem || 'Não foi possível fazer o rollback.');
      },
    });
  }

  private executarRemocao(id: number): void {
    this.executandoAcao = true;
    this.service.remover(id).subscribe({
      next: () => {
        this.executandoAcao = false;
        this.toastr.success('Relatório removido.');
        this.novo();
      },
      error: async (error) => {
        const detalhe = await this.service.lerErro(error);
        this.executandoAcao = false;
        this.toastr.error(detalhe?.mensagem || 'Não foi possível remover o relatório.');
      },
    });
  }

  private atualizarSelecionado(relatorio: RelatorioAdmin): void {
    this.selecionado = relatorio;
    this.versaoPublicacao = relatorio.ultimaVersao;
    this.previewVersao = relatorio.ultimaVersao;
    this.invalidarPreview();
    this.carregarDetalhe();
    this.carregarVersoes();
    this.carregarAuditoria();
  }

  private abrirPreviewHtml(response: HttpResponse<Blob>): void {
    this.limparPreviewHtml();
    this.previewObjectUrl = URL.createObjectURL(new Blob([response.body || ''], { type: 'text/html' }));
    this.previewHtmlSeguro = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
    if (this.previewHtmlModal) {
      this.modalRef = this.modalService.show(this.previewHtmlModal, { class: 'modal-xl', backdrop: 'static' });
    }
    this.toastr.success('Prévia HTML gerada com sucesso.');
  }

  private limparPreviewHtml(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
    }
    this.previewObjectUrl = undefined;
    this.previewHtmlSeguro = undefined;
  }

  private baixar(response: HttpResponse<Blob>, fallback: string): void {
    const url = URL.createObjectURL(response.body || new Blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = this.service.nomeArquivo(response, fallback);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private confirmar(titulo: string, texto: string, acao: () => void): void {
    this.tituloConfirmacao = titulo;
    this.textoConfirmacao = texto;
    this.acaoConfirmada = acao;
    if (this.confirmacaoModal) {
      this.modalRef = this.modalService.show(this.confirmacaoModal, { class: 'modal-md', backdrop: 'static' });
    }
  }

  private atualizarDefinicao(valor: string): void {
    this.definicaoTexto = valor;
    this.sincronizarSqlDoYaml();
  }

  private sincronizarSqlDoYaml(): void {
    const bloco = this.localizarBlocoSql(this.definicaoTexto);
    if (!bloco) {
      this.sqlTexto = '';
      this.sqlConversaoNecessaria = true;
      this.avisoSql = 'consulta.sql não usa um bloco editável (sql: |, >, |- ou >-). Converta-o para editar por esta visão.';
      this.marcadoresSql = [];
      return;
    }

    const linhas = this.definicaoTexto.split(/\r?\n/);
    this.sqlTexto = linhas
      .slice(bloco.inicioConteudo, bloco.fimConteudo)
      .map((linha) => linha.startsWith(bloco.indentacaoConteudo)
        ? linha.slice(bloco.indentacaoConteudo.length)
        : linha.trim() ? linha : '')
      .join('\n');
    this.sqlConversaoNecessaria = false;
    this.avisoSql = 'Alterações no SQL são reindentadas e gravadas de volta em consulta.sql; o restante do YAML é preservado.';
    this.atualizarMarcadores();
  }

  private localizarBlocoSql(yaml: string): BlocoSqlYaml | undefined {
    const linhas = yaml.split(/\r?\n/);
    for (let indiceConsulta = 0; indiceConsulta < linhas.length; indiceConsulta++) {
      const consulta = linhas[indiceConsulta].match(/^( *)consulta\s*:\s*(?:#.*)?$/);
      if (!consulta) {
        continue;
      }

      const nivelConsulta = consulta[1].length;
      let nivelFilho: number | undefined;
      for (let indiceSql = indiceConsulta + 1; indiceSql < linhas.length; indiceSql++) {
        const linha = linhas[indiceSql];
        if (!linha.trim() || linha.trimStart().startsWith('#')) {
          continue;
        }
        const indentacao = linha.match(/^ */)?.[0] || '';
        if (indentacao.length <= nivelConsulta) {
          break;
        }
        if (nivelFilho == null) {
          nivelFilho = indentacao.length;
        }
        if (indentacao.length !== nivelFilho) {
          continue;
        }

        const sql = linha.match(/^( *)sql\s*:\s*([>|])([1-9]?[+-]?|[+-]?[1-9]?)\s*(?:#.*)?$/);
        if (!sql) {
          continue;
        }

        const nivelSql = sql[1].length;
        const inicioConteudo = indiceSql + 1;
        let fimConteudo = inicioConteudo;
        while (fimConteudo < linhas.length) {
          const linhaConteudo = linhas[fimConteudo];
          const nivelConteudo = (linhaConteudo.match(/^ */)?.[0] || '').length;
          if (linhaConteudo.trim() && nivelConteudo <= nivelSql) {
            break;
          }
          fimConteudo++;
        }

        const indicadorIndentacao = sql[3].match(/[1-9]/)?.[0];
        let nivelIndentacao = indicadorIndentacao
          ? nivelSql + Number(indicadorIndentacao)
          : 0;
        if (!nivelIndentacao) {
          const niveis = linhas
            .slice(inicioConteudo, fimConteudo)
            .filter((item) => !!item.trim())
            .map((item) => (item.match(/^ */)?.[0] || '').length);
          nivelIndentacao = niveis.length ? Math.min(...niveis) : nivelSql + 2;
        }
        if (nivelIndentacao <= nivelSql) {
          return undefined;
        }

        return {
          inicioConteudo,
          fimConteudo,
          indentacaoConteudo: ' '.repeat(nivelIndentacao),
        };
      }
    }
    return undefined;
  }

  private atualizarMarcadores(): void {
    this.marcadoresYaml = this.problemas
      .filter((problema) => problema.linha != null
        && !problema.caminho.startsWith('template')
        && !problema.caminho.startsWith('consulta.sql'))
      .map((problema) => ({
        linha: problema.linha as number,
        mensagem: `${problema.caminho}: ${problema.mensagem}`,
      }));

    const bloco = this.localizarBlocoSql(this.definicaoTexto);
    this.marcadoresSql = bloco
      ? this.problemas
        .filter((problema) => problema.linha != null
          && problema.caminho.startsWith('consulta.sql')
          && (problema.linha as number) > bloco.inicioConteudo
          && (problema.linha as number) <= bloco.fimConteudo)
        .map((problema) => ({
          linha: (problema.linha as number) - bloco.inicioConteudo,
          mensagem: `${problema.caminho}: ${problema.mensagem}`,
        }))
      : [];

    this.marcadoresTemplate = this.problemas
      .filter((problema) => problema.linha != null && problema.caminho.startsWith('template'))
      .map((problema) => ({
        linha: problema.linha as number,
        mensagem: `${problema.caminho}: ${problema.mensagem}`,
      }));
  }
}
