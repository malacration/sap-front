import { Component, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, from, of, switchMap } from 'rxjs';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { Column } from '../../../shared/components/table/column.model';
import { Branch } from '../../../sap/model/branch';
import { SalesPerson } from '../../../sap/model/sales-person/sales-person';
import {
  CATEGORIAS_DOCUMENTO_LOTE, CategoriaDocumentoLote, FormaPagamentoLote, LinhaImportacaoLote, NotaFiscalLote,
  SITUACAO_IMPORTACAO_ROTULO, SITUACAO_TROCA_ROTULO,
  STATUS_SAP_NOTA, StatusSapNota, StatusSefaz, TipoDocumentoLote, TrocaFormaPagamentoResultado, categoriaInfo,
} from '../../../sap/model/fiscal/nota-fiscal-lote';
import { NotaFiscalLoteFiltro, NotaFiscalLoteService } from '../../../sap/service/fiscal/nota-fiscal-lote.service';
import { NotaFiscalLoteStorageService } from '../../../sap/service/fiscal/nota-fiscal-lote-storage.service';
import { SearchService } from '../../../sap/service/search.service';
import { BusinessPartner } from '../../../sap/model/business-partner/business-partner';
import { AlertService } from '../../../shared/service/alert.service';
import { AuthService } from '../../../shared/service/auth.service';
import { LogoService } from '../../../core/services/logo.service';

@Component({
  selector: 'app-nota-fiscal-lote',
  templateUrl: './nota-fiscal-lote.component.html',
  styleUrls: ['./nota-fiscal-lote.component.scss'],
})
export class NotaFiscalLoteComponent implements OnInit, OnDestroy {

  readonly limite = NotaFiscalLoteService.LIMITE_LOTE;
  readonly tamanhoPagina = 50;

  definition: Column[] = [];
  notas: NotaFiscalLote[] = [];
  totalItens = 0;
  paginaAtual = 0;

  loading = false;
  selecionandoFiltro = false;
  baixando = false;

  dataInicial = '';
  dataFinal = '';
  vencimentoDe = '';
  vencimentoAte = '';
  // Uma NF so. Preenchida, as datas de emissao e vencimento nao filtram (ver filtro): achar uma
  // NF de outro mes nao pode depender de lembrar de limpar a emissao. Texto, nao type=number: la
  // um "e" ou "-" digitado chega como null e a busca sairia pelas datas sem aviso.
  numeroNf = '';
  filiaisSelecionadas: Branch[] = [];
  clienteSelecionado: any = null;
  vendedorSelecionado: SalesPerson | null = null;
  filtroStatusSap: StatusSapNota | '' = '';
  // ID da "ProcessStatus"; '' = todos. String porque o <select> devolve string.
  filtroStatusSefaz = '';
  // '' = todos, '-1' = sem boleto, senao o ID do status na BankPlus.
  filtroBoletoStatus = '';
  statusBoletoOpcoes: StatusSefaz[] = [];
  // '' = todas: NF-e de saida, NF-e venda futura antiga e adiantamentos.
  filtroCategoria: CategoriaDocumentoLote | '' = '';

  readonly statusSapOpcoes = STATUS_SAP_NOTA;
  readonly categoriaOpcoes = CATEGORIAS_DOCUMENTO_LOTE;
  statusSefazOpcoes: StatusSefaz[] = [];

  baixarPdf = true;
  baixarXml = true;
  // Desmarcado por padrao: so parte das notas tem boleto (forma de pagamento) e cada um e mais
  // uma chamada a BankPlus por parcela.
  baixarBoleto = false;
  // PDF do contrato de venda futura de cada adiantamento (NF nao tem).
  baixarContrato = false;
  // Tipos do download em andamento, para o aviso nao mudar se alguem mexer nas caixas.
  boletoNoDownload = false;

  // Trocar o valor recria os componentes de busca do filtro (ver o ngFor no template).
  versaoFiltros = 0;

  // Busca de cliente do filtro pela rota do lote, sem o recorte de carteira do vendedor.
  readonly buscaCliente: SearchService<BusinessPartner> = { search: (palavra) => this.service.buscarClientes(palavra) };

  /**
   * O lote, montado a mao: por tipo + docEntry, na ordem em que entrou. Sobrevive a troca de pagina, de
   * filtro e ao Limpar dos filtros - o usuario marca uma nota, vai atras de outra com outros
   * filtros e marca de novo. So "Limpar lote" e o X de cada nota tiram algo. Fica guardado na aba
   * (NotaFiscalLoteStorageService).
   */
  // Chave tipo + docEntry (NotaFiscalLote.chave): NF e adiantamento podem ter o mesmo docEntry.
  private selecao = new Map<string, NotaFiscalLote>();

  // Copia do lote para o painel, refeita a cada mudanca (loteAlterado), e nao getter: o painel
  // redesenharia a lista a cada ciclo de deteccao.
  notasDoLote: NotaFiscalLote[] = [];
  totalDoLote = 0;
  quantidadeBaixando = 0;

  // Troca da forma de pagamento dos documentos do lote (grava no SAP).
  formasPagamento: FormaPagamentoLote[] = [];
  // Filtro da lista: todas as formas de recebimento, inclusive inativas.
  formasFiltro: FormaPagamentoLote[] = [];
  filtroFormaPagamento = '';
  formaEscolhida = '';
  trocandoForma = false;
  // Confirmacao da troca aberta: o lote fica travado para o que vai ser gravado ser o que foi confirmado.
  private confirmandoTroca = false;
  // A confirmacao e uma Promise do dialogo: sair da tela nao a cancela como cancela as subscriptions.
  private destruido = false;
  resultadosTroca: TrocaFormaPagamentoResultado[] = [];
  // Importacao da planilha do banco: so as linhas que pedem atencao (o resto ja foi para o lote).
  importando = false;
  linhasImportacao: LinhaImportacaoLote[] = [];
  readonly situacaoImportacaoRotulo = SITUACAO_IMPORTACAO_ROTULO;
  private importacao?: Subscription;
  readonly situacaoRotulo = SITUACAO_TROCA_ROTULO;
  private troca?: Subscription;


  // Filtro da lista que esta na tela. Paginar e "selecionar todas" usam este, nao o que esta
  // digitado no formulario e ainda nao foi aplicado com Filtrar.
  private filtroAplicado: NotaFiscalLoteFiltro = {};

  // Consulta em andamento. Uma nova cancela a anterior: sem isso a resposta de um filtro antigo
  // chegando por ultimo sobrescrevia a lista e desligava o loading da consulta atual.
  private consultaLista?: Subscription;
  private consultaTodas?: Subscription;
  // Sair da tela no meio de um lote cancela o download: sem isso o zip ainda seria salvo e os
  // avisos apareceriam depois, em outra tela.
  private download?: Subscription;

  constructor(private service: NotaFiscalLoteService, private toastr: ToastrService,
              private alert: AlertService, private storage: NotaFiscalLoteStorageService,
              private auth: AuthService, private logoService?: LogoService) {}

  ngOnDestroy(): void {
    this.destruido = true;
    this.consultaLista?.unsubscribe();
    this.consultaTodas?.unsubscribe();
    this.download?.unsubscribe();
    this.troca?.unsubscribe();
    this.importacao?.unsubscribe();
  }

  ngOnInit(): void {
    this.definition = this.service.getDefinition();
    this.service.statusSefaz().subscribe((status) => (this.statusSefazOpcoes = status ?? []));
    this.service.statusBoleto().subscribe((status) => (this.statusBoletoOpcoes = status ?? []));
    this.service.formasPagamento().subscribe((formas) => (this.formasPagamento = formas ?? []));
    this.service.formasPagamento(true).subscribe((formas) => (this.formasFiltro = formas ?? []));
    this.carregarLote();
    this.definirPeriodoPadrao();
    this.filtrar();
  }

  get filtrandoPorNf(): boolean {
    return (this.numeroNf ?? '').trim() !== '';
  }

  private get numeroNfValido(): number | null {
    const texto = (this.numeroNf ?? '').trim();
    return /^\d+$/.test(texto) && Number(texto) > 0 ? Number(texto) : null;
  }

  get filtro(): NotaFiscalLoteFiltro {
    const porNf = this.filtrandoPorNf;
    return {
      dataInicial: porNf ? null : this.dataInicial || null,
      dataFinal: porNf ? null : this.dataFinal || null,
      filial: this.filiaisSelecionadas
        .map((filial) => Number(filial?.Bplid ?? filial?.BPLID))
        .filter((id) => Number.isFinite(id)),
      cardCode: this.clienteSelecionado?.CardCode ?? null,
      salesPersonCode: this.vendedorSelecionado?.SalesEmployeeCode != null
        ? Number(this.vendedorSelecionado.SalesEmployeeCode)
        : null,
      // O backend filtra por faixa; uma NF so e a faixa de um numero.
      numeroDe: porNf ? this.numeroNfValido : null,
      numeroAte: porNf ? this.numeroNfValido : null,
      vencimentoDe: porNf ? null : this.vencimentoDe || null,
      vencimentoAte: porNf ? null : this.vencimentoAte || null,
      statusSap: this.filtroStatusSap || null,
      statusSefaz: this.filtroStatusSefaz !== '' ? Number(this.filtroStatusSefaz) : null,
      boletoStatus: this.filtroBoletoStatus !== '' ? Number(this.filtroBoletoStatus) : null,
      categoria: this.filtroCategoria || null,
      formaPagamento: this.filtroFormaPagamento || null,
    };
  }

  filtrar(): void {
    if (this.filtrandoPorNf && this.numeroNfValido == null) {
      this.toastr.warning('Digite o número da NF (só números).');
      return;
    }
    // Com NF preenchida as datas nao entram no filtro, entao nao barram a busca.
    if (!this.filtrandoPorNf && this.dataInicial && this.dataFinal && this.dataInicial > this.dataFinal) {
      this.toastr.warning('A emissão inicial é depois da final.');
      return;
    }
    if (!this.filtrandoPorNf && this.vencimentoDe && this.vencimentoAte && this.vencimentoDe > this.vencimentoAte) {
      this.toastr.warning('O vencimento inicial é depois do final.');
      return;
    }
    this.filtroAplicado = this.filtro;
    // O lote fica. So o "adicionar todas" pendente cai: ele era do filtro que saiu da tela.
    this.cancelarAdicionarTodas();
    this.carregarPagina(0);
  }

  carregarPagina(pagina: number): void {
    this.consultaLista?.unsubscribe();
    this.loading = true;
    this.consultaLista = this.service.listar(this.filtroAplicado, pagina, this.tamanhoPagina).subscribe({
      next: (page) => {
        this.notas = page.content;
        // Nota do lote que reaparece na busca: troca pelo dado novo (status SEFAZ pode ter
        // mudado). O set mantem a posicao no lote.
        this.notas.filter((nota) => this.selecao.has(nota.chave))
          .forEach((nota) => this.selecao.set(nota.chave, nota));
        this.totalItens = page.totalElements;
        this.paginaAtual = pagina;
        this.loading = false;
        this.loteAlterado();
      },
      error: (erro) => {
        this.loading = false;
        this.avisarFalhaInesperada(erro, 'Não foi possível montar a lista.');
      },
    });
  }

  // Erro HTTP o interceptor ja mostra. O resto (bug ao montar a resposta) sumia em silencio:
  // a lista so ficava vazia, parecendo "nenhum documento".
  private avisarFalhaInesperada(erro: any, mensagem: string): void {
    if (!(erro instanceof HttpErrorResponse)) {
      console.error(erro);
      this.toastr.error(mensagem);
    }
  }

  limparFiltros(): void {
    this.definirPeriodoPadrao();
    this.vencimentoDe = '';
    this.vencimentoAte = '';
    this.numeroNf = '';
    this.filiaisSelecionadas = [];
    this.clienteSelecionado = null;
    this.vendedorSelecionado = null;
    this.filtroStatusSap = '';
    this.filtroStatusSefaz = '';
    this.filtroBoletoStatus = '';
    this.filtroCategoria = '';
    this.filtroFormaPagamento = '';
    this.versaoFiltros++;
    this.filtrar();
  }

  onFilialChange(branches: Branch[]): void {
    this.filiaisSelecionadas = branches ?? [];
    this.filtrar();
  }

  onClienteChange(parceiro: any): void {
    this.clienteSelecionado = parceiro ?? null;
    this.filtrar();
  }

  onVendedorChange(vendedor: SalesPerson): void {
    this.vendedorSelecionado = vendedor ?? null;
    this.filtrar();
  }

  get quantidadeSelecionada(): number {
    return this.selecao.size;
  }

  get todasDaPaginaSelecionadas(): boolean {
    return this.notas.length > 0 && this.notas.every((nota) => nota.selecionado);
  }

  action(event: ActionReturn): void {
    if (event.type === 'nota-lote-toggle-selecao' && !this.loteTravado()) {
      const nota = event.data as NotaFiscalLote;
      if (this.selecao.has(nota.chave)) {
        this.remover(nota.chave);
      } else {
        this.adicionar([nota]);
      }
    }
  }

  alternarSelecaoDaPagina(): void {
    if (this.loteTravado()) {
      return;
    }
    if (this.todasDaPaginaSelecionadas) {
      this.remover(...this.notas.map((nota) => nota.chave));
    } else {
      this.adicionar(this.notas);
    }
  }

  /**
   * Poe no lote tudo o que o filtro da lista devolve, nao so a pagina, somando ao que ja estava.
   * Busca uma pagina do tamanho do teto, POR DOCUMENTO (a lista da tela e por parcela, e o total
   * dela conta parcelas); se o filtro tiver mais documentos que isso, nao adiciona nada e pede
   * para estreitar, em vez de pegar um pedaco arbitrario.
   */
  adicionarTodasDoFiltro(): void {
    if (this.loteTravado()) {
      return;
    }
    this.consultaTodas?.unsubscribe();
    this.selecionandoFiltro = true;
    this.consultaTodas = this.service.listar(this.filtroAplicado, 0, this.limite, true).subscribe({
      next: (page) => {
        this.selecionandoFiltro = false;
        if (page.totalElements > this.limite) {
          this.avisarFiltroGrande(page.totalElements);
          return;
        }
        this.adicionar(page.content);
      },
      error: () => {
        this.selecionandoFiltro = false;
      },
    });
  }

  /**
   * Monta o lote a partir da planilha de titulos do banco: o backend acha o documento e a parcela
   * de cada titulo pelo nosso numero. Os documentos somam ao lote (tudo ou nada, como o resto); as
   * linhas que nao viraram documento, ou que divergem, ficam listadas.
   */
  importarPlanilha(input: HTMLInputElement): void {
    const arquivo = input.files?.[0];
    // Limpa ja: escolher o mesmo arquivo de novo tem de disparar o change.
    input.value = '';
    if (!arquivo || this.loteTravado()) {
      return;
    }
    // O "adicionar todas" pendente poria documentos no lote no meio da importacao (e seria recusado
    // pela trava): espera ele terminar.
    if (this.selecionandoFiltro) {
      this.toastr.info('Espere o "Adicionar todas do filtro" terminar.');
      return;
    }
    if (!arquivo.name.toLowerCase().endsWith('.xlsx')) {
      this.toastr.warning('Use a planilha em .xlsx (se o banco exportou .xls, abra e salve como .xlsx).');
      return;
    }
    this.importacao?.unsubscribe();
    this.importando = true;
    this.importacao = this.service.importarPlanilha(arquivo).subscribe({
      next: (r) => {
        this.importando = false;
        this.linhasImportacao = r.linhas.filter((l) => l.situacao !== 'ENCONTRADO');
        const titulos = r.linhas.length;
        const naoViraram = r.linhas.filter((l) => l.situacao === 'NAO_ENCONTRADO' || l.situacao === 'FORA_DA_TELA').length;
        if (r.documentos.length === 0) {
          this.toastr.warning(`Nenhum dos ${titulos} título(s) da planilha virou documento do lote. Veja o motivo abaixo da lista.`);
          return;
        }
        if (!this.adicionar(r.documentos)) {
          return;
        }
        const partes = [`${titulos} título(s) da planilha: ${r.documentos.length} documento(s) no lote`];
        if (naoViraram > 0) {
          partes.push(`${naoViraram} sem documento`);
        }
        const divergentes = r.linhas.filter((l) => l.situacao === 'DIVERGENTE').length;
        if (divergentes > 0) {
          partes.push(`${divergentes} com divergência`);
        }
        if (this.linhasImportacao.length > 0) {
          this.toastr.warning(partes.join(', ') + '. Veja as linhas abaixo da lista.', 'Planilha', { timeOut: 15000 });
        } else {
          this.toastr.success(partes.join(', ') + '.', 'Planilha');
        }
      },
      error: () => {
        this.importando = false;
      },
    });
  }

  fecharImportacao(): void {
    this.linhasImportacao = [];
  }

  private avisarFiltroGrande(total: number): void {
    this.toastr.warning(
      `O filtro tem ${total} notas e o lote aceita até ${this.limite}. Estreite o período, a filial ou o cliente.`);
  }

  private cancelarAdicionarTodas(): void {
    this.consultaTodas?.unsubscribe();
    this.selecionandoFiltro = false;
  }

  /**
   * Unico lugar que poe nota no lote, e por isso o unico que aplica o teto: o que ja esta no lote
   * e ignorado, e se o resto passar do limite nada entra (tudo ou nada, como o "adicionar todas").
   */
  private adicionar(notas: NotaFiscalLote[]): boolean {
    // Tambem pega resposta de "adicionar todas" pedida antes do download comecar.
    if (this.loteTravado()) {
      return false;
    }
    const novas = new Map<string, NotaFiscalLote>();
    notas.filter((nota) => !this.selecao.has(nota.chave)).forEach((nota) => novas.set(nota.chave, nota));
    if (novas.size === 0) {
      return true;
    }
    if (this.selecao.size + novas.size > this.limite) {
      this.toastr.warning(
        `O lote tem ${this.selecao.size} nota(s); com estas ficaria com ${this.selecao.size + novas.size}, e o limite é ${this.limite}.`);
      return false;
    }
    novas.forEach((nota, chave) => this.selecao.set(chave, nota));
    this.loteAlterado();
    return true;
  }

  // Pela chave: a linha da tabela costuma ser outro objeto do mesmo documento que esta no lote.
  remover(...chaves: string[]): void {
    if (this.loteTravado()) {
      return;
    }
    const removeu = chaves.map((chave) => this.selecao.delete(chave)).some((r) => r);
    if (removeu) {
      this.loteAlterado();
    }
  }

  limparLote(): void {
    if (this.selecao.size === 0 || this.loteTravado()) {
      return;
    }
    this.alert.confirm(`Tirar as ${this.selecao.size} nota(s) do lote?`).then((resposta) => {
      if (resposta.isConfirmed) {
        this.esvaziarLote();
      }
    });
  }

  private esvaziarLote(): void {
    this.cancelarAdicionarTodas();
    this.selecao.clear();
    this.loteAlterado();
  }

  trackByChave(_: number, nota: NotaFiscalLote): string {
    return nota.chave;
  }

  /**
   * Troca a forma de pagamento de todos os documentos do lote, inclusive fechados e cancelados:
   * o que o SAP recusar volta como erro. Se o parceiro nao tiver a forma no cadastro, o backend
   * vincula e repete. Boleto ja emitido nao e mexido; o resultado avisa quando ficou ativo.
   */
  trocarFormaPagamento(): void {
    if (this.loteTravado()) {
      return;
    }
    if (this.selecao.size === 0) {
      this.toastr.warning('O lote está vazio.');
      return;
    }
    const forma = this.formasPagamento.find((f) => f.codigo === this.formaEscolhida);
    if (!forma) {
      this.toastr.warning('Escolha a forma de pagamento.');
      return;
    }
    const documentos = Array.from(this.selecao.values());
    // NF de venda futura do padrao antigo: o SAP nao deixa trocar a forma, e o backend nem tenta.
    // Lote guardado antes da categoria existir nao sabe: o resultado mostra como "Não permitido".
    const naoPermitidos = documentos.filter((d) => d.categoria === 'NF_FUTURA' && d.formaPagamento !== forma.codigo).length;
    if (naoPermitidos === documentos.length) {
      this.toastr.warning('O SAP não deixa trocar a forma de pagamento de NF de venda futura do padrão antigo (fatura de reserva).');
      return;
    }
    // Um "adicionar todas" pendente mudaria o lote com a confirmacao aberta, e a troca gravaria so
    // o lote de antes: cancela e trava ate a resposta do usuario.
    this.cancelarAdicionarTodas();
    this.confirmandoTroca = true;
    const foraDaTroca = naoPermitidos > 0
      ? ` ${naoPermitidos} NF(s) de venda futura do padrão antigo ficam de fora: o SAP não deixa trocar a forma delas.`
      : '';
    this.alert.confirm(
      `Trocar a forma de pagamento de ${documentos.length - naoPermitidos} documento(s) para "${forma.descricao || forma.codigo}"? ` +
      'Grava no SAP. Parceiro que não tiver essa forma no cadastro vai recebê-la.' + foraDaTroca
    ).then((resposta) => {
      this.confirmandoTroca = false;
      // Confirmado depois de sair da tela (voltar do navegador com o dialogo aberto): nao grava.
      if (resposta.isConfirmed && !this.destruido) {
        this.executarTroca(forma.codigo, documentos);
      }
    }, () => {
      this.confirmandoTroca = false;
    });
  }

  private executarTroca(forma: string, documentos: NotaFiscalLote[]): void {
    this.trocandoForma = true;
    this.resultadosTroca = [];
    this.troca?.unsubscribe();
    this.troca = this.service.trocarFormaPagamento(forma, documentos).subscribe({
      next: (resultados) => {
        this.trocandoForma = false;
        this.resultadosTroca = resultados ?? [];
        // Atualiza a forma mostrada no lote; a lista da tela e recarregada para refletir o SAP.
        // SEM_MUDANCA tambem: o SAP confirmou que o documento ja esta com a forma, e a copia do lote
        // pode estar velha (documento fora da pagina que vai ser recarregada).
        this.resultadosTroca
          .filter((r) => r.situacao === 'ATUALIZADO' || r.situacao === 'VINCULADO_E_ATUALIZADO' || r.situacao === 'SEM_MUDANCA')
          .forEach((r) => {
            const nota = this.selecao.get(`${r.tipo}-${r.docEntry}`);
            if (nota) {
              nota.formaPagamento = forma;
              nota.formaPagamentoNome = this.formasPagamento.find((f) => f.codigo === forma)?.descricao ?? null;
            }
          });
        this.loteAlterado();
        this.avisarResultadoTroca();
        this.carregarPagina(this.paginaAtual);
      },
      error: (erro) => {
        this.trocandoForma = false;
        // Sem resposta do backend (rede, gateway que desistiu antes do prazo da troca): a troca pode
        // ter gravado parte do lote. Recusa do proprio backend (validacao) nao grava nada, e o
        // interceptor ja mostra.
        if (!(erro instanceof HttpErrorResponse) || erro.status === 0 || erro.status >= 502) {
          this.toastr.warning('Não deu para confirmar o resultado da troca: parte dos documentos pode ter sido gravada. ' +
            'Confira no SAP antes de repetir.', 'Forma de pagamento', { timeOut: 15000 });
          this.carregarPagina(this.paginaAtual);
        }
      },
    });
  }

  private avisarResultadoTroca(): void {
    const conta = (...situacoes: string[]) => this.resultadosTroca.filter((r) => situacoes.includes(r.situacao)).length;
    const trocados = conta('ATUALIZADO', 'VINCULADO_E_ATUALIZADO');
    const vinculados = conta('VINCULADO_E_ATUALIZADO');
    const falhas = conta('ERRO', 'NAO_ENCONTRADO');
    const semConfirmacao = conta('SEM_CONFIRMACAO');
    const pendentes = this.resultadosTroca.filter((r) => r.pendencia).length;
    const comBoleto = this.resultadosTroca.filter((r) => r.boletoAtivo).length;
    const partes = [`${trocados} trocado(s)`];
    if (vinculados > 0) {
      partes.push(`${vinculados} com a forma vinculada ao parceiro`);
    }
    if (conta('SEM_MUDANCA') > 0) {
      partes.push(`${conta('SEM_MUDANCA')} já estavam com essa forma`);
    }
    // Ja avisado na confirmacao: fica de fora, nao e problema.
    if (conta('NAO_PERMITIDO') > 0) {
      partes.push(`${conta('NAO_PERMITIDO')} NF(s) de venda futura antiga de fora`);
    }
    if (falhas > 0 || semConfirmacao > 0 || pendentes > 0) {
      const problemas = [];
      if (falhas > 0) {
        problemas.push(`${falhas} com erro`);
      }
      // O prazo acabou com a gravacao em andamento: pode ter gravado ou nao.
      if (semConfirmacao > 0) {
        problemas.push(`${semConfirmacao} sem confirmação (confira no SAP)`);
      }
      if (pendentes > 0) {
        problemas.push(`${pendentes} com pendência`);
      }
      this.toastr.warning(`${partes.join(', ')}; ${problemas.join(', ')}. Veja o resultado no lote.`,
        'Forma de pagamento', { timeOut: 15000 });
    } else {
      this.toastr.success(partes.join(', ') + '.', 'Forma de pagamento');
    }
    if (comBoleto > 0) {
      this.toastr.info(`${comBoleto} documento(s) ainda têm boleto ativo na BankPlus.`, 'Boletos', { timeOut: 15000 });
    }
  }

  // So o que pede atencao: erro, nao encontrado ou aviso (boleto ativo, conferencia que falhou).
  get resultadosComAtencao(): TrocaFormaPagamentoResultado[] {
    return this.resultadosTroca.filter((r) =>
      r.situacao === 'ERRO' || r.situacao === 'NAO_ENCONTRADO' || r.situacao === 'SEM_CONFIRMACAO' || !!r.mensagem);
  }

  get quantidadeTrocada(): number {
    return this.resultadosTroca.filter((r) => r.situacao === 'ATUALIZADO' || r.situacao === 'VINCULADO_E_ATUALIZADO').length;
  }

  fecharResultadosTroca(): void {
    this.resultadosTroca = [];
  }

  categoriaDo(r: TrocaFormaPagamentoResultado) {
    return categoriaInfo(r.categoria, r.tipo);
  }

  baixar(): void {
    if (this.trocandoForma || this.importando) {
      this.toastr.info(`Espere ${this.importando ? 'a importação da planilha' : 'a troca da forma de pagamento'} terminar.`);
      return;
    }
    if (this.selecao.size === 0) {
      this.toastr.warning('Selecione ao menos uma nota.');
      return;
    }
    if (!this.algumTipoMarcado) {
      this.toastr.warning('Marque DANFE, XML, boleto ou contrato.');
      return;
    }
    if (this.selecao.size > this.limite) {
      this.toastr.warning(`O lote aceita até ${this.limite} notas; há ${this.selecao.size} selecionadas.`);
      return;
    }
    // Adiantamento nao tem DANFE nem XML (so boleto e contrato); NF nao tem contrato. Lote que nao
    // geraria arquivo nenhum nem vai ao servidor.
    const documentos = Array.from(this.selecao.values());
    const notasFiscais = documentos.filter((n) => n.tipo !== 'AD').length;
    const adiantamentos = documentos.length - notasFiscais;
    const nfGeraArquivo = this.baixarPdf || this.baixarXml || this.baixarBoleto;
    const adGeraArquivo = this.baixarBoleto || this.baixarContrato;
    if ((notasFiscais === 0 || !nfGeraArquivo) && (adiantamentos === 0 || !adGeraArquivo)) {
      this.toastr.warning(adiantamentos === 0
        ? 'O contrato só vem de adiantamento de venda futura: marque DANFE, XML ou boleto para as NF-e.'
        : 'Adiantamento só tem boleto e contrato (não emite NF-e): marque "Boleto" ou "Contrato" para baixar.');
      return;
    }
    this.baixando = true;
    // Sem "Boleto" nem "Contrato", adiantamento nao tem o que baixar: vai so para o avisos.txt do zip.
    const adiantamentosSemArquivo = adGeraArquivo ? 0 : adiantamentos;
    const notasSemArquivo = nfGeraArquivo ? 0 : notasFiscais;
    // O erro pode ser de qualquer documento pedido, adiantamento incluido (nao encontrado, por exemplo).
    const pedidos = this.selecao.size;
    const quantidade = pedidos - adiantamentosSemArquivo - notasSemArquivo;
    this.quantidadeBaixando = quantidade;
    this.boletoNoDownload = this.baixarBoleto;
    this.download?.unsubscribe();
    const [pdf, xml, boleto, contrato] = [this.baixarPdf, this.baixarXml, this.baixarBoleto, this.baixarContrato];
    // O logo do PDF do contrato e o do deploy da tela; sem contrato nem busca (e o pedido sai na hora).
    const logo = contrato && this.logoService ? from(this.logoService.dataUri()) : of(null);
    this.download = logo.pipe(
      switchMap((dataUri) => this.service.baixar(documentos, pdf, xml, boleto, contrato, dataUri))
    ).subscribe({
      next: (download) => {
        this.salvar(download.arquivo, download.nome);
        this.baixando = false;
        if (download.notasComErro > 0) {
          this.toastr.warning(
            `${download.notasComErro} de ${pedidos} documento(s) não vieram completos. O motivo está no arquivo erros.txt dentro do zip.`,
            'Lote baixado com pendências',
            { timeOut: 15000 });
        } else {
          this.toastr.success(`${quantidade} nota(s) baixada(s).`);
        }
        if (adiantamentosSemArquivo > 0) {
          this.toastr.info(
            `${adiantamentosSemArquivo} adiantamento(s) sem arquivo: adiantamento só tem boleto e contrato, ` +
            'e nenhum dos dois estava marcado. ' +
            'O detalhe de cada um está no zip (avisos.txt ou, se houve erro, erros.txt).',
            'Adiantamentos',
            { timeOut: 15000 });
        }
        // Nao e erro: a forma de pagamento da nota nao e boleto, ou o boleto foi cancelado.
        if (download.notasSemBoleto > 0) {
          this.toastr.info(
            `${download.notasSemBoleto} nota(s) sem boleto (forma de pagamento sem boleto ou boleto cancelado). A lista está em avisos.txt.`,
            'Boletos',
            { timeOut: 15000 });
        }
      },
      error: () => {
        this.baixando = false;
      },
    });
  }

  get algumTipoMarcado(): boolean {
    return this.baixarPdf || this.baixarXml || this.baixarBoleto || this.baixarContrato;
  }

  /**
   * Durante o download o lote nao muda: o zip sai das notas do momento do clique, e mexer no
   * painel enquanto isso (tirar uma nota que esta sendo baixada, por exemplo) daria a impressao
   * errada do que vem no arquivo.
   */
  // Importacao tambem trava: a resposta dela poe documentos no lote, e um download ou uma troca
  // no meio faria o adicionar recusar e os documentos se perderem.
  private loteTravado(): boolean {
    if (this.baixando || this.trocandoForma || this.confirmandoTroca || this.importando) {
      const oQue = this.baixando ? 'o download' : this.importando ? 'a importação da planilha' : 'a troca da forma de pagamento';
      this.toastr.info(`Espere ${oQue} terminar para mudar o lote.`);
      return true;
    }
    return false;
  }

  // Toda mudanca do lote passa por aqui: refaz a copia do painel, a marcacao da tabela e o que
  // esta guardado na aba.
  private loteAlterado(): void {
    this.notasDoLote = Array.from(this.selecao.values());
    this.totalDoLote = this.notasDoLote.reduce((soma, nota) => soma + (Number(nota.total) || 0), 0);
    this.notas.forEach((nota) => (nota.selecionado = this.selecao.has(nota.chave)));
    this.storage.salvar(this.notasDoLote, this.usuario());
  }

  private carregarLote(): void {
    this.storage.carregar(this.usuario()).forEach((nota) => this.selecao.set(nota.chave, nota));
    this.loteAlterado();
  }

  /**
   * Dono do lote guardado: um id que nao repete entre contas nem muda ao renovar o token. Os dois
   * tokens do app invertem os campos:
   *  - Keycloak (tem iss): sub e o id da conta; jti muda a cada renovacao.
   *  - interno (JwtHandler do backend): sub e o NOME da pessoa, que pode repetir; jti e o id da
   *    conta (user.id), junto com a origem (vendedor, cliente...), que tem ids proprios.
   * O getUser() nao serve: devolve o nome de exibicao.
   */
  private usuario(): string {
    try {
      const token = this.auth.getDecodeToken();
      if (token?.iss) {
        return `kc:${token.sub ?? ''}`;
      }
      return `int:${token?.origin ?? ''}:${token?.jti ?? token?.username ?? ''}`;
    } catch {
      return '';
    }
  }

  private definirPeriodoPadrao(): void {
    this.dataInicial = moment().startOf('month').format('YYYY-MM-DD');
    this.dataFinal = moment().format('YYYY-MM-DD');
  }

  private salvar(conteudo: Blob | null, nome: string): void {
    if (!conteudo) {
      return;
    }
    const url = URL.createObjectURL(conteudo);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    // Revoga no proximo tick: revogar antes do clique processar cancela o download.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
