import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { NotaFiscalLoteComponent } from './nota-fiscal-lote.component';
import { NotaFiscalLoteStorageService } from '../../../sap/service/fiscal/nota-fiscal-lote-storage.service';
import { NotaFiscalLote } from '../../../sap/model/fiscal/nota-fiscal-lote';
import { NotaFiscalLoteService } from '../../../sap/service/fiscal/nota-fiscal-lote.service';
import { Page } from '../../../sap/model/page.model';
import { BusinessPartnerDefinition } from '../../../sap/model/business-partner/business-partner-definition';

describe('NotaFiscalLoteComponent', () => {

  const CHAVE = NotaFiscalLoteStorageService.CHAVE;
  // O lote fica no sessionStorage e o ngOnInit o recarrega: sem limpar, um teste herdaria o
  // lote do anterior.
  beforeEach(() => sessionStorage.removeItem(CHAVE));
  afterEach(() => sessionStorage.removeItem(CHAVE));

  const FORMAS = [{ codigo: 'AVISTA', descricao: 'DEPOSITO' }, { codigo: 'pix-vencimento', descricao: 'Pix uzzipay' }];

  // Storage de verdade; auth e confirm falsos. Fake de service sem as chamadas de forma de
  // pagamento ganha as padrao aqui.
  function novoComponente(service: any, toastr: any, opcoes: { confirma?: boolean; usuario?: string; token?: any } = {}) {
    service.formasPagamento ??= () => of(FORMAS);
    service.trocarFormaPagamento ??= () => of([]);
    const alert = { confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve({ isConfirmed: opcoes.confirma ?? true })) };
    // Token Keycloak por padrao; name igual para todo mundo de proposito: o lote nao separa por nome.
    const auth = { getDecodeToken: () => opcoes.token ?? ({ iss: 'https://sso', sub: opcoes.usuario ?? 'Fulano', name: 'Nome Igual' }) };
    // Logo do deploy: data: URI fixa.
    const logo = { dataUri: () => Promise.resolve('data:image/png;base64,AAA=') };
    return new NotaFiscalLoteComponent(service, toastr, alert as any, new NotaFiscalLoteStorageService(), auth as any, logo as any);
  }

  function nota(docEntry: number, numero = docEntry + 500): NotaFiscalLote {
    return NotaFiscalLote.from({ docEntry, numero, serie: '2', data: '2026-09-30', total: 10 });
  }

  function pagina(notas: NotaFiscalLote[], totalElements = notas.length): Page<NotaFiscalLote> {
    return Object.assign(new Page<NotaFiscalLote>(), { content: notas, totalElements, size: notas.length });
  }

  // Sem TestBed, mesmo estilo do spec da cobranca: o que interessa e a selecao e o lote.
  function tela(paginas: { [pagina: number]: Page<NotaFiscalLote> }, todasDoFiltro?: Page<NotaFiscalLote>,
                opcoes: { confirma?: boolean; usuario?: string; token?: any } = {}) {
    const chamadas = { listar: [] as any[], baixar: [] as any[] };
    const service = {
      getDefinition: () => [],
      statusSefaz: () => of([{ id: 4, descricao: 'Autorizada' }]),
      listar: (filtro: any, page: number, size: number, porDocumento?: boolean) => {
        chamadas.listar.push({ filtro, page, size, porDocumento });
        if (size === NotaFiscalLoteService.LIMITE_LOTE && todasDoFiltro) {
          return of(todasDoFiltro);
        }
        return of(paginas[page] ?? pagina([]));
      },
      baixar: (documentos: NotaFiscalLote[], pdf: boolean, xml: boolean, boleto: boolean) => {
        chamadas.baixar.push({ docEntries: documentos.map((d) => d.docEntry), pdf, xml, boleto });
        return of({ arquivo: null, nome: 'notas.zip', notasComErro: 0, notasSemBoleto: boleto ? 1 : 0 });
      },
    } as any;
    const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'error', 'info']);
    const componente = novoComponente(service, toastr, opcoes);
    componente.ngOnInit();
    return { componente, chamadas, toastr };
  }

  it('abre com o mes corrente ate hoje e ja filtra', () => {
    const { componente, chamadas } = tela({ 0: pagina([nota(1)]) });
    expect(componente.dataInicial).toMatch(/^\d{4}-\d{2}-01$/);
    expect(chamadas.listar[0].filtro.dataInicial).toBe(componente.dataInicial);
    expect(chamadas.listar[0].filtro.dataFinal).toBe(componente.dataFinal);
    expect(componente.notas.length).toBe(1);
  });

  it('selecao sobrevive a troca de pagina', () => {
    const { componente } = tela({ 0: pagina([nota(1), nota(2)], 4), 1: pagina([nota(3), nota(4)], 4) });
    componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[0] } as any);
    componente.carregarPagina(1);
    componente.alternarSelecaoDaPagina();
    expect(componente.quantidadeSelecionada).toBe(3);

    componente.carregarPagina(0);
    expect(componente.notas.map((n) => n.selecionado)).toEqual([true, false]);
  });

  it('filtrar e limpar os filtros mantem o lote, e a nota achada de novo aparece marcada', () => {
    const { componente } = tela({ 0: pagina([nota(1)]) });
    componente.alternarSelecaoDaPagina();
    componente.filtroStatusSap = 'CANCELADO';
    componente.filtrar();
    componente.limparFiltros();
    expect(componente.quantidadeSelecionada).toBe(1);
    expect(componente.notas[0].selecionado).toBeTrue();
  });

  it('selecionar todas do filtro marca tambem as notas fora da pagina', () => {
    const { componente } = tela({ 0: pagina([nota(1), nota(2)], 3) }, pagina([nota(1), nota(2), nota(3)]));
    componente.adicionarTodasDoFiltro();
    expect(componente.quantidadeSelecionada).toBe(3);
    expect(componente.todasDaPaginaSelecionadas).toBeTrue();
  });

  it('filtro acima do teto nao seleciona nada e avisa', () => {
    const { componente, chamadas, toastr } = tela({ 0: pagina([nota(1)], NotaFiscalLoteService.LIMITE_LOTE + 1) });
    componente.adicionarTodasDoFiltro();
    expect(componente.quantidadeSelecionada).toBe(0);
    // a lista e por parcela: o teto e conferido pedindo por documento
    expect(chamadas.listar.length).toBe(2);
    expect(chamadas.listar[1].porDocumento).toBeTrue();
    expect(toastr.warning).toHaveBeenCalled();
  });

  it('linha de parcela mostra numero, vencimento e valor dela; o lote junta as parcelas do documento', () => {
    const parcela = (n: number, valor: number, venc: string) =>
      NotaFiscalLote.from({ tipo: 'NF', docEntry: 7, numero: 507, total: 1000, parcelas: 3, parcela: n, valorParcela: valor,
        vencimentoParcela: venc, vencimentoInicial: '2026-10-01', vencimentoFinal: '2026-12-01' });
    const linhas = [parcela(1, 333.33, '2026-10-01'), parcela(2, 333.33, '2026-11-01'), parcela(3, 333.34, '2026-12-01')];
    expect(linhas[1].parcelaFormatada).toBe('2/3');
    expect(linhas[1].vencimentoFormatado).toBe('01/11/2026');
    expect(linhas[2].valorParcelaCurrency).toContain('333,34');
    const { componente } = tela({ 0: pagina(linhas) });
    componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[1] } as any);
    expect(componente.notasDoLote.length).toBe(1);
    expect(componente.notas.every((n) => n.selecionado)).toBeTrue();
    // sem parcela (lote guardado antes), o vencimento volta a ser o do documento
    expect(NotaFiscalLote.from({ docEntry: 1, parcelas: 3, vencimentoInicial: '2026-10-01', vencimentoFinal: '2026-12-01' })
      .vencimentoFormatado).toBe('01/10/2026 a 01/12/2026 (3 parc.)');
  });

  it('baixa os docEntries selecionados com os tipos marcados', () => {
    const { componente, chamadas, toastr } = tela({ 0: pagina([nota(1), nota(2)]) });
    componente.alternarSelecaoDaPagina();
    componente.baixarPdf = false;
    componente.baixar();
    expect(chamadas.baixar).toEqual([{ docEntries: [1, 2], pdf: false, xml: true, boleto: false }]);
    expect(toastr.success).toHaveBeenCalled();
  });

  it('boleto vai no pedido e nota sem boleto vira aviso, nao erro', () => {
    const { componente, chamadas, toastr } = tela({ 0: pagina([nota(1)]) });
    componente.alternarSelecaoDaPagina();
    componente.baixarPdf = false;
    componente.baixarXml = false;
    componente.baixarBoleto = true;
    componente.baixar();
    expect(chamadas.baixar).toEqual([{ docEntries: [1], pdf: false, xml: false, boleto: true }]);
    expect(toastr.info).toHaveBeenCalled();
    expect(toastr.warning).not.toHaveBeenCalled();
  });

  it('boleto vem desmarcado', () => {
    const { componente } = tela({ 0: pagina([]) });
    expect(componente.baixarBoleto).toBeFalse();
  });

  it('nao baixa sem selecao nem sem tipo de arquivo', () => {
    const { componente, chamadas } = tela({ 0: pagina([nota(1)]) });
    componente.baixar();
    componente.alternarSelecaoDaPagina();
    componente.baixarPdf = false;
    componente.baixarXml = false;
    componente.baixar();
    expect(chamadas.baixar.length).toBe(0);
  });

  it('carrega os status SEFAZ da TaxPlus para o filtro', () => {
    const { componente } = tela({ 0: pagina([]) });
    expect(componente.statusSefazOpcoes).toEqual([{ id: 4, descricao: 'Autorizada' }]);
  });

  it('manda os filtros de status SAP e SEFAZ e o limpar zera os dois', () => {
    const { componente, chamadas } = tela({ 0: pagina([]) });
    componente.filtroStatusSap = 'CANCELADO';
    componente.filtroStatusSefaz = '4';
    componente.filtrar();
    expect(chamadas.listar[1].filtro.statusSap).toBe('CANCELADO');
    expect(chamadas.listar[1].filtro.statusSefaz).toBe(4);

    componente.limparFiltros();
    expect(chamadas.listar[2].filtro.statusSap).toBeNull();
    expect(chamadas.listar[2].filtro.statusSefaz).toBeNull();
  });

  it('mostra status SAP e SEFAZ legiveis', () => {
    const n = NotaFiscalLote.from({ docEntry: 1, statusSap: 'CANCELADO', statusSefaz: 'Autorizada', statusSefazId: 4 });
    expect(n.statusSapLabel).toBe('Cancelado');
    expect(n.statusSefazLabel).toBe('Autorizada');
    expect(NotaFiscalLote.from({ docEntry: 1, statusSefazId: 99 }).statusSefazLabel).toBe('Status 99');
  });

  it('manda vencimento e o limpar zera', () => {
    const { componente, chamadas } = tela({ 0: pagina([]) });
    componente.vencimentoDe = '2026-10-01';
    componente.vencimentoAte = '2026-10-31';
    componente.filtrar();
    expect([chamadas.listar[1].filtro.vencimentoDe, chamadas.listar[1].filtro.vencimentoAte]).toEqual(['2026-10-01', '2026-10-31']);

    componente.limparFiltros();
    const limpo = chamadas.listar[2].filtro;
    expect([limpo.numeroDe, limpo.numeroAte, limpo.vencimentoDe, limpo.vencimentoAte]).toEqual([null, null, null, null]);
  });

  it('periodo invertido avisa e nao consulta', () => {
    const { componente, chamadas, toastr } = tela({ 0: pagina([]) });
    componente.vencimentoDe = '2026-10-31';
    componente.vencimentoAte = '2026-10-01';
    componente.filtrar();
    componente.vencimentoDe = '';
    componente.dataInicial = '2026-09-30';
    componente.dataFinal = '2026-09-01';
    componente.filtrar();
    expect(chamadas.listar.length).toBe(1);
    expect(toastr.warning).toHaveBeenCalledTimes(2);
  });

  describe('Nº da NF', () => {
    it('busca a NF como faixa de um numero so e sem as datas', () => {
      const { componente, chamadas } = tela({ 0: pagina([]) });
      componente.vencimentoDe = '2026-10-01';
      componente.numeroNf = '5815';
      componente.filtrar();
      const filtro = chamadas.listar[1].filtro;
      expect([filtro.numeroDe, filtro.numeroAte]).toEqual([5815, 5815]);
      expect([filtro.dataInicial, filtro.dataFinal, filtro.vencimentoDe, filtro.vencimentoAte]).toEqual([null, null, null, null]);
      expect(componente.filtrandoPorNf).toBeTrue();
    });

    it('os outros filtros continuam valendo junto com a NF', () => {
      const { componente, chamadas } = tela({ 0: pagina([]) });
      componente.filtroStatusSefaz = '4';
      componente.numeroNf = '5815';
      componente.filtrar();
      expect(chamadas.listar[1].filtro.statusSefaz).toBe(4);
    });

    it('com NF, periodo invertido nas datas nao barra a busca', () => {
      const { componente, chamadas } = tela({ 0: pagina([]) });
      componente.dataInicial = '2026-09-30';
      componente.dataFinal = '2026-09-01';
      componente.numeroNf = '5815';
      componente.filtrar();
      expect(chamadas.listar.length).toBe(2);
    });

    it('apagar a NF volta a filtrar pelas datas que estavam na tela', () => {
      const { componente, chamadas } = tela({ 0: pagina([]) });
      componente.numeroNf = '5815';
      componente.filtrar();
      componente.numeroNf = '';
      componente.filtrar();
      expect(chamadas.listar[2].filtro.dataInicial).toBe(componente.dataInicial);
      expect(chamadas.listar[2].filtro.numeroDe).toBeNull();
    });

    it('NF que nao e inteiro positivo avisa e nao consulta - inclusive texto incompleto', () => {
      const { componente, chamadas, toastr } = tela({ 0: pagina([]) });
      ['0', '-3', '1.5', 'e', '12a'].forEach((valor) => {
        componente.numeroNf = valor;
        componente.filtrar();
      });
      expect(chamadas.listar.length).toBe(1);
      expect(toastr.warning).toHaveBeenCalledTimes(5);
    });

    it('espaco em volta da NF nao atrapalha e campo so com espaco e vazio', () => {
      const { componente, chamadas } = tela({ 0: pagina([]) });
      componente.numeroNf = ' 5815 ';
      componente.filtrar();
      expect(chamadas.listar[1].filtro.numeroDe).toBe(5815);
      componente.numeroNf = '   ';
      componente.filtrar();
      expect(chamadas.listar[2].filtro.numeroDe).toBeNull();
      expect(chamadas.listar[2].filtro.dataInicial).toBe(componente.dataInicial);
    });
  });

  it('vencimento mostra a faixa quando ha varias parcelas', () => {
    const unica = NotaFiscalLote.from({ docEntry: 1, vencimentoInicial: '2026-10-22', vencimentoFinal: '2026-10-22', parcelas: 1 });
    const varias = NotaFiscalLote.from({ docEntry: 2, vencimentoInicial: '2026-10-22', vencimentoFinal: '2027-02-19', parcelas: 5 });
    expect(unica.vencimentoFormatado).toBe('22/10/2026');
    expect(varias.vencimentoFormatado).toBe('22/10/2026 a 19/02/2027 (5 parc.)');
  });

  // Service cujas respostas o teste solta na ordem que quiser.
  function telaAssincrona() {
    const pendentes: { filtro: any; page: number; size: number; resposta: Subject<Page<NotaFiscalLote>> }[] = [];
    const service = {
      getDefinition: () => [],
      statusSefaz: () => of([]),
      listar: (filtro: any, page: number, size: number) => {
        const resposta = new Subject<Page<NotaFiscalLote>>();
        pendentes.push({ filtro, page, size, resposta });
        return resposta;
      },
    } as any;
    const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'error', 'info']);
    const componente = novoComponente(service, toastr);
    componente.ngOnInit();
    const responde = (i: number, p: Page<NotaFiscalLote>) => { pendentes[i].resposta.next(p); pendentes[i].resposta.complete(); };
    return { componente, pendentes, responde, toastr };
  }

  it('resposta de um filtro antigo chegando por ultimo nao sobrescreve a lista', () => {
    const { componente, responde } = telaAssincrona();
    componente.filtroStatusSap = 'CANCELADO';
    componente.filtrar();
    responde(1, pagina([nota(2)]));
    expect(componente.loading).toBeFalse();
    responde(0, pagina([nota(1)]));
    expect(componente.notas.map((n) => n.docEntry)).toEqual([2]);
  });

  it('consulta nova mantem o loading ate a propria resposta', () => {
    const { componente, responde } = telaAssincrona();
    componente.filtrar();
    responde(0, pagina([nota(1)]));
    expect(componente.loading).toBeTrue();
    responde(1, pagina([nota(2)]));
    expect(componente.loading).toBeFalse();
  });

  it('adicionar todas pendente nao volta depois de limpar o lote', fakeAsync(() => {
    const { componente, responde } = telaAssincrona();
    responde(0, pagina([nota(1), nota(2)], 2));
    componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[0] } as any);
    componente.adicionarTodasDoFiltro();
    componente.limparLote();
    flushMicrotasks();
    responde(1, pagina([nota(1), nota(2)]));
    expect(componente.quantidadeSelecionada).toBe(0);
  }));

  it('adicionar todas pendente cai ao filtrar, mas o lote fica', () => {
    const { componente, pendentes, responde } = telaAssincrona();
    responde(0, pagina([nota(1)], 1));
    componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[0] } as any);
    componente.adicionarTodasDoFiltro();
    componente.filtrar();
    responde(1, pagina([nota(1), nota(5)]));
    expect(componente.quantidadeSelecionada).toBe(1);
    expect(pendentes.length).toBe(3);
  });

  it('paginar usa o filtro aplicado, nao o que foi digitado sem Filtrar', () => {
    const { componente, chamadas } = tela({ 0: pagina([nota(1)], 60), 1: pagina([nota(2)], 60) });
    componente.numeroNf = '900';
    componente.carregarPagina(1);
    expect(chamadas.listar[1].filtro.numeroDe).toBeNull();
  });

  it('selecionar todas confere o total da propria resposta', () => {
    const { componente, toastr } = tela({ 0: pagina([nota(1)], 3) },
      pagina([nota(1), nota(2)], NotaFiscalLoteService.LIMITE_LOTE + 5));
    componente.adicionarTodasDoFiltro();
    expect(componente.quantidadeSelecionada).toBe(0);
    expect(toastr.warning).toHaveBeenCalled();
  });

  it('busca de cliente vai pela rota do lote', () => {
    const buscar = jasmine.createSpy('buscarClientes').and.returnValue(of(new Page()));
    const service = { getDefinition: () => [], statusSefaz: () => of([]), listar: () => of(pagina([])), buscarClientes: buscar } as any;
    const componente = novoComponente(service, jasmine.createSpyObj('ToastrService', ['warning']));
    componente.buscaCliente.search('mauro');
    expect(buscar).toHaveBeenCalledWith('mauro');
  });

  it('sair da tela no meio do download cancela e nao avisa depois', () => {
    const resposta = new Subject<any>();
    const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'error', 'info']);
    const service = {
      getDefinition: () => [], statusSefaz: () => of([]), listar: () => of(pagina([nota(1)])),
      baixar: () => resposta,
    } as any;
    const componente = novoComponente(service, toastr);
    componente.ngOnInit();
    componente.alternarSelecaoDaPagina();
    componente.baixar();
    componente.ngOnDestroy();
    resposta.next({ arquivo: null, nome: 'notas.zip', notasComErro: 0, notasSemBoleto: 0 });
    expect(toastr.success).not.toHaveBeenCalled();
    expect(resposta.observed).toBeFalse();
  });

  it('colunas da busca de cliente escapam o texto do cadastro', () => {
    const colunas = new BusinessPartnerDefinition().getDefinition();
    ['CardCode', 'CardName', 'CpfCnpjStr'].forEach((propriedade) =>
      expect(colunas.find((c) => c.property === propriedade)?.html).toBe('{{value}}'));
  });

  describe('lote montado a mao', () => {

    function marcar(componente: NotaFiscalLoteComponent, docEntry: number) {
      componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas.find((n) => n.docEntry === docEntry) } as any);
    }

    it('marca, troca o filtro, marca outra e baixa as duas', () => {
      // pagina 0 muda conforme o filtro aplicado
      const chamadas = { baixar: [] as any[] };
      const service = {
        getDefinition: () => [], statusSefaz: () => of([]),
        listar: (filtro: any) => of(pagina(filtro.statusSap === 'CANCELADO' ? [nota(2)] : [nota(1)])),
        baixar: (documentos: NotaFiscalLote[]) => {
          chamadas.baixar.push(documentos.map((d) => d.docEntry));
          return of({ arquivo: null, nome: 'n.zip', notasComErro: 0, notasSemBoleto: 0 });
        },
      } as any;
      const componente = novoComponente(service, jasmine.createSpyObj('ToastrService', ['warning', 'success', 'info']));
      componente.ngOnInit();
      marcar(componente, 1);
      componente.filtroStatusSap = 'CANCELADO';
      componente.filtrar();
      marcar(componente, 2);

      expect(componente.notasDoLote.map((n) => n.docEntry)).toEqual([1, 2]);
      componente.baixar();
      expect(chamadas.baixar).toEqual([[1, 2]]);
    });

    it('o X tira a nota do lote e desmarca a linha, mesmo sendo outro objeto', () => {
      // objetos novos a cada busca, como vem do HTTP
      const service = { getDefinition: () => [], statusSefaz: () => of([]), listar: () => of(pagina([nota(1), nota(2)])) } as any;
      const componente = novoComponente(service, jasmine.createSpyObj('ToastrService', ['warning']));
      componente.ngOnInit();
      componente.alternarSelecaoDaPagina();
      const antes = componente.notas[0];
      componente.filtrar();
      expect(componente.notas[0]).not.toBe(antes);
      componente.remover('NF-1');
      expect(componente.notasDoLote.map((n) => n.docEntry)).toEqual([2]);
      expect(componente.notas.map((n) => n.selecionado)).toEqual([false, true]);
    });

    it('durante o download o lote nao muda', () => {
      const resposta = new Subject<any>();
      const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'error', 'info']);
      const service = {
        getDefinition: () => [], statusSefaz: () => of([]), listar: () => of(pagina([nota(1), nota(2)])),
        baixar: () => resposta,
      } as any;
      const componente = novoComponente(service, toastr);
      componente.ngOnInit();
      marcar(componente, 1);
      componente.baixar();

      marcar(componente, 2);
      componente.remover('NF-1');
      componente.alternarSelecaoDaPagina();
      expect(componente.notasDoLote.map((n) => n.docEntry)).toEqual([1]);
      expect(toastr.info).toHaveBeenCalled();

      resposta.next({ arquivo: null, nome: 'n.zip', notasComErro: 0, notasSemBoleto: 0 });
      resposta.complete();
      marcar(componente, 2);
      expect(componente.notasDoLote.map((n) => n.docEntry)).toEqual([1, 2]);
    });

    it('soma o total das notas do lote', () => {
      const { componente } = tela({ 0: pagina([nota(1), nota(2)]) });
      componente.alternarSelecaoDaPagina();
      expect(componente.totalDoLote).toBe(20);
    });

    it('adicionar todas soma ao que ja estava no lote', () => {
      const { componente } = tela({ 0: pagina([nota(1)], 2) }, pagina([nota(2), nota(3)]));
      marcar(componente, 1);
      componente.adicionarTodasDoFiltro();
      expect(componente.notasDoLote.map((n) => n.docEntry)).toEqual([1, 2, 3]);
    });

    describe('limpar lote', () => {
      it('confirmado esvazia e tira do storage', fakeAsync(() => {
        const { componente } = tela({ 0: pagina([nota(1)]) });
        componente.alternarSelecaoDaPagina();
        expect(sessionStorage.getItem(CHAVE)).not.toBeNull();
        componente.limparLote();
        flushMicrotasks();
        expect(componente.quantidadeSelecionada).toBe(0);
        expect(componente.notas[0].selecionado).toBeFalse();
        expect(sessionStorage.getItem(CHAVE)).toBeNull();
      }));

      it('cancelado mantem o lote', fakeAsync(() => {
        const { componente } = tela({ 0: pagina([nota(1)]) }, undefined, { confirma: false });
        componente.alternarSelecaoDaPagina();
        componente.limparLote();
        flushMicrotasks();
        expect(componente.quantidadeSelecionada).toBe(1);
      }));
    });

    describe('teto de ' + NotaFiscalLoteService.LIMITE_LOTE, () => {
      const limite = NotaFiscalLoteService.LIMITE_LOTE;
      const muitas = (inicio: number, n: number) => Array.from({ length: n }, (_, i) => nota(inicio + i));

      it('marcar a pagina que passaria do teto nao adiciona nada e avisa', () => {
        const { componente, toastr } = tela({ 0: pagina(muitas(1, limite - 1)), 1: pagina(muitas(1000, 2)) });
        componente.alternarSelecaoDaPagina();
        componente.carregarPagina(1);
        componente.alternarSelecaoDaPagina();
        expect(componente.quantidadeSelecionada).toBe(limite - 1);
        expect(toastr.warning).toHaveBeenCalled();
      });

      it('com o lote cheio a linha nao entra', () => {
        const { componente } = tela({ 0: pagina(muitas(1, limite)), 1: pagina([nota(5000)]) });
        componente.alternarSelecaoDaPagina();
        componente.carregarPagina(1);
        marcar(componente, 5000);
        expect(componente.quantidadeSelecionada).toBe(limite);
      });

      it('adicionar todas que passaria do teto nao adiciona nada', () => {
        const { componente } = tela({ 0: pagina(muitas(1, limite - 1), limite - 1) }, pagina(muitas(5000, 2)));
        componente.alternarSelecaoDaPagina();
        componente.adicionarTodasDoFiltro();
        expect(componente.quantidadeSelecionada).toBe(limite - 1);
      });

    });

    describe('guardado na aba', () => {
      it('salva so os dados da nota e um componente novo recarrega o lote', () => {
        const { componente } = tela({ 0: pagina([nota(1), nota(2)]) });
        componente.alternarSelecaoDaPagina();
        const salvo = JSON.parse(sessionStorage.getItem(CHAVE)!);
        expect(salvo.v).toBe(2);
        expect(salvo.notas[0].tipo).toBe('NF');
        expect(salvo.usuario).toBe('kc:Fulano');
        expect(Object.keys(salvo.notas[0])).not.toContain('selecionado');

        const outro = tela({ 0: pagina([]) }).componente;
        expect(outro.notasDoLote.map((n) => n.docEntry)).toEqual([1, 2]);
        expect(outro.notasDoLote[0].notaFormatada).toBe('501 / 2');
      });

      it('nao serializa o FormControl que a tabela pendura na linha', () => {
        const { componente } = tela({ 0: pagina([nota(1)]) });
        const circular: any = {}; circular.eu = circular;
        (componente.notas[0] as any).formControlFactorynotaFormatada = circular;
        componente.alternarSelecaoDaPagina();
        expect(JSON.parse(sessionStorage.getItem(CHAVE)!).notas.length).toBe(1);
      });

      it('lote de outro usuario, versao desconhecida, JSON quebrado ou docEntry invalido sao ignorados', () => {
        const casos = [
          JSON.stringify({ v: 1, usuario: 'kc:Outro', notas: [{ docEntry: 1 }] }),
          JSON.stringify({ v: 3, usuario: 'kc:Fulano', notas: [{ docEntry: 1 }] }),
          '{quebrado',
          JSON.stringify({ v: 1, usuario: 'kc:Fulano', notas: [{ docEntry: 'x' }, { docEntry: -1 }, { docEntry: 7 }, { docEntry: 7 }] }),
        ];
        const lotes = casos.map((salvo) => {
          sessionStorage.setItem(CHAVE, salvo);
          return tela({ 0: pagina([]) }).componente.notasDoLote.map((n) => n.docEntry);
        });
        expect(lotes).toEqual([[], [], [], [7]]);
      });

      it('Keycloak: separa pelo sub, e renovar o token (jti novo) mantem o lote', () => {
        const kc = (sub: string, jti: string) => ({ iss: 'https://sso', sub, jti, name: 'Nome Igual' });
        const { componente } = tela({ 0: pagina([nota(1)]) }, undefined, { token: kc('sub-a', 'jti-1') });
        componente.alternarSelecaoDaPagina();
        expect(tela({ 0: pagina([]) }, undefined, { token: kc('sub-a', 'jti-2') }).componente.quantidadeSelecionada).toBe(1);
        expect(tela({ 0: pagina([]) }, undefined, { token: kc('sub-b', 'jti-1') }).componente.quantidadeSelecionada).toBe(0);
      });

      it('token interno: sub e o nome, entao separa pelo id da conta (jti) e pela origem', () => {
        // JwtHandler do backend: id(user.id), subject(user.name)
        const interno = (jti: string, origin: string) => ({ sub: 'Joao da Silva', jti, origin, username: 'joao' });
        const { componente } = tela({ 0: pagina([nota(1)]) }, undefined, { token: interno('60', 'SalePerson') });
        componente.alternarSelecaoDaPagina();
        expect(tela({ 0: pagina([]) }, undefined, { token: interno('60', 'SalePerson') }).componente.quantidadeSelecionada).toBe(1);
        expect(tela({ 0: pagina([]) }, undefined, { token: interno('61', 'SalePerson') }).componente.quantidadeSelecionada).toBe(0);
        expect(tela({ 0: pagina([]) }, undefined, { token: interno('60', 'BusinessPartner') }).componente.quantidadeSelecionada).toBe(0);
      });

      it('storage que lanca nao quebra a tela', () => {
        spyOn(Storage.prototype, 'getItem').and.throwError('SecurityError');
        spyOn(Storage.prototype, 'setItem').and.throwError('QuotaExceededError');
        const { componente } = tela({ 0: pagina([nota(1)]) });
        componente.alternarSelecaoDaPagina();
        expect(componente.quantidadeSelecionada).toBe(1);
      });
    });

  });

  describe('adiantamento de venda futura', () => {
    const ad = (docEntry: number, numero = docEntry + 5000) =>
      NotaFiscalLote.from({ tipo: 'AD', docEntry, numero, contrato: 412, data: '2026-09-30', total: 100, statusSap: 'ABERTO' });

    it('filtro de tipo (categoria) vai para a busca e o limpar volta para todos', () => {
      const { componente, chamadas } = tela({ 0: pagina([]) });
      componente.filtroCategoria = 'NF_FUTURA';
      componente.filtrar();
      expect(chamadas.listar[1].filtro.categoria).toBe('NF_FUTURA');
      componente.limparFiltros();
      expect(chamadas.listar[2].filtro.categoria).toBeNull();
    });

    it('NF de venda futura do padrao antigo tem rotulo e cor proprios', () => {
      const futura = NotaFiscalLote.from({ tipo: 'NF', categoria: 'NF_FUTURA', docEntry: 1 });
      const saida = NotaFiscalLote.from({ tipo: 'NF', categoria: 'NF', docEntry: 2 });
      expect(futura.tipoLabel).toBe('NF-e venda futura');
      expect(futura.tipoBadge).toBe('badge-warning');
      expect(saida.tipoLabel).toBe('NF-e');
      expect(futura.tipoHtml).toBe('<span class="badge badge-warning">NF-e venda futura</span>');
      // sem categoria (lote antigo), vale a do tipo
      expect(NotaFiscalLote.from({ tipo: 'AD', docEntry: 3 }).tipoLabel).toBe('Adiant. venda futura');
    });

    it('lote guardado sem categoria recebe a do tipo; NF futura volta como NF futura', () => {
      sessionStorage.setItem(CHAVE, JSON.stringify({ v: 2, usuario: 'kc:Fulano', notas: [
        { tipo: 'AD', docEntry: 7 }, { tipo: 'NF', categoria: 'NF_FUTURA', docEntry: 8 }] }));
      const lote = tela({ 0: pagina([]) }).componente.notasDoLote;
      expect(lote.map((n) => n.categoria)).toEqual(['AD', 'NF_FUTURA']);
    });

    it('NF e adiantamento com o mesmo docEntry entram os dois no lote e vao em listas separadas', () => {
      const chamadas: any[] = [];
      const service = {
        getDefinition: () => [], statusSefaz: () => of([]), listar: () => of(pagina([nota(10), ad(10)])),
        baixar: (documentos: NotaFiscalLote[]) => {
          chamadas.push(NotaFiscalLoteService.porTipo(documentos));
          return of({ arquivo: null, nome: 'n.zip', notasComErro: 0, notasSemBoleto: 0 });
        },
      } as any;
      const componente = novoComponente(service, jasmine.createSpyObj('ToastrService', ['warning', 'success', 'info']));
      componente.ngOnInit();
      componente.alternarSelecaoDaPagina();
      expect(componente.notasDoLote.map((n) => n.chave)).toEqual(['NF-10', 'AD-10']);
      componente.baixar();
      expect(chamadas).toEqual([{ docEntries: [10], adiantamentos: [10] }]);
    });

    it('lote so de adiantamentos sem Boleto nao baixa (nao tem DANFE nem XML); com Boleto ou com NF baixa', () => {
      const { componente, chamadas, toastr } = tela({ 0: pagina([ad(10), nota(1)]) });
      componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[0] } as any);
      componente.baixar();
      expect(chamadas.baixar.length).toBe(0);
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('Boleto'));

      componente.baixarBoleto = true;
      componente.baixar();
      expect(chamadas.baixar.length).toBe(1);

      componente.baixarBoleto = false;
      componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[1] } as any);
      componente.baixar();
      expect(chamadas.baixar.length).toBe(2);
    });

    it('NF com adiantamento sem Boleto: conta so a NF como baixada e avisa o adiantamento sem arquivo', () => {
      const { componente, toastr } = tela({ 0: pagina([ad(10), nota(1)]) });
      componente.alternarSelecaoDaPagina();
      componente.baixar();
      expect(toastr.success).toHaveBeenCalledWith('1 nota(s) baixada(s).');
      expect(toastr.info)
        .toHaveBeenCalledWith(jasmine.stringContaining('1 adiantamento(s) sem arquivo'), 'Adiantamentos', jasmine.anything());

      toastr.info.calls.reset();
      componente.baixarBoleto = true;
      componente.baixar();
      expect(toastr.success).toHaveBeenCalledWith('2 nota(s) baixada(s).');
      expect(toastr.info).not.toHaveBeenCalledWith(jasmine.anything(), 'Adiantamentos', jasmine.anything());
    });

    it('erro de adiantamento sem Boleto conta sobre o total pedido, nao so sobre as NF', () => {
      const service = {
        getDefinition: () => [], statusSefaz: () => of([]), listar: () => of(pagina([nota(1), ad(10), ad(11)])),
        baixar: () => of({ arquivo: null, nome: 'n.zip', notasComErro: 2, notasSemBoleto: 0 }),
      } as any;
      const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'info']);
      const componente = novoComponente(service, toastr);
      componente.ngOnInit();
      componente.alternarSelecaoDaPagina();
      componente.baixar();
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('2 de 3 documento(s)'), jasmine.anything(), jasmine.anything());
    });

    it('contrato: adiantamento baixa so com Contrato marcado, e o logo da tela vai junto', fakeAsync(() => {
      const chamadas: any[] = [];
      const service = {
        getDefinition: () => [], statusSefaz: () => of([]), listar: () => of(pagina([ad(10)])),
        baixar: (...args: any[]) => {
          chamadas.push(args);
          return of({ arquivo: null, nome: 'n.zip', notasComErro: 0, notasSemBoleto: 0 });
        },
      } as any;
      const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'info']);
      const componente = novoComponente(service, toastr);
      componente.ngOnInit();
      componente.alternarSelecaoDaPagina();
      componente.baixarPdf = false;
      componente.baixarXml = false;
      componente.baixarContrato = true;
      componente.baixar();
      flushMicrotasks();
      expect(chamadas.length).toBe(1);
      const [, pdf, xml, boleto, contrato, logo] = chamadas[0];
      expect([pdf, xml, boleto, contrato]).toEqual([false, false, false, true]);
      expect(logo).toBe('data:image/png;base64,AAA=');
      expect(toastr.success).toHaveBeenCalledWith('1 nota(s) baixada(s).');
    }));

    it('so Contrato marcado com lote so de NF-e nem vai ao servidor', () => {
      const { componente, chamadas, toastr } = tela({ 0: pagina([nota(1)]) });
      componente.alternarSelecaoDaPagina();
      componente.baixarPdf = false;
      componente.baixarXml = false;
      componente.baixarContrato = true;
      componente.baixar();
      expect(chamadas.baixar.length).toBe(0);
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('O contrato só vem de adiantamento'));
    });

    it('sem Contrato o logo nem e buscado e o pedido sai na hora', () => {
      const { componente, chamadas } = tela({ 0: pagina([nota(1)]) });
      componente.alternarSelecaoDaPagina();
      componente.baixar();
      expect(chamadas.baixar.length).toBe(1);
    });

    it('rotulos do adiantamento', () => {
      const a = ad(10, 5831);
      expect(a.tipoLabel).toBe('Adiant. venda futura');
      expect(a.contratoFormatado).toBe('VF 412');
      expect(a.statusSefazLabel).toBe('Sem NF-e');
      expect(NotaFiscalLote.from({ tipo: 'AD', docEntry: 1, statusSap: 'DEVOLVIDO' }).statusSapLabel).toBe('Devolvido');
    });

    it('lote guardado na versao 1 (so NF) e lido como NF; adiantamento volta com o tipo', () => {
      sessionStorage.setItem(CHAVE, JSON.stringify({ v: 1, usuario: 'kc:Fulano', notas: [{ docEntry: 7, numero: 507 }] }));
      expect(tela({ 0: pagina([]) }).componente.notasDoLote.map((n) => n.chave)).toEqual(['NF-7']);

      sessionStorage.removeItem(CHAVE);
      const { componente } = tela({ 0: pagina([ad(10)]) });
      componente.alternarSelecaoDaPagina();
      const recarregado = tela({ 0: pagina([]) }).componente.notasDoLote[0];
      expect(recarregado.chave).toBe('AD-10');
      expect(recarregado.contrato).toBe(412);
    });
  });

  describe('importar planilha do banco', () => {
    const linha = (n: number, situacao: string, extra: any = {}) =>
      ({ linha: n, nossoNumero: `3515854000002100${n}`, beneficiario: `005715 ${n}`, pagador: 'P', valor: 10, vencimento: '2026-11-16',
        situacaoBanco: 'Normal', tipo: 'NF', docEntry: 250976, parcela: n, situacao, mensagem: null, ...extra });
    function telaImportacao(resposta: any) {
      const t = tela({ 0: pagina([]) });
      const chamadas: Blob[] = [];
      (t.componente as any).service.importarPlanilha = (arquivo: Blob) => { chamadas.push(arquivo); return resposta; };
      const input = { files: [new File(['x'], 'titulos.xlsx')], value: 'C:\\fakepath\\titulos.xlsx' } as any;
      return { ...t, chamadas, input };
    }

    it('poe os documentos no lote e lista so as linhas que pedem atencao', () => {
      const { componente, toastr, input, chamadas } = telaImportacao(of({
        documentos: [nota(250976)],
        linhas: [
          linha(1, 'ENCONTRADO'),
          linha(2, 'DIVERGENTE', { mensagem: 'valor' }),
          linha(3, 'NAO_ENCONTRADO', { tipo: null, docEntry: null }),
        ],
      }));
      componente.importarPlanilha(input);
      expect(chamadas.length).toBe(1);
      expect(input.value).toBe('');
      expect(componente.notasDoLote.map((n) => n.chave)).toEqual(['NF-250976']);
      expect(componente.linhasImportacao.map((l) => l.linha)).toEqual([2, 3]);
      expect(toastr.warning).toHaveBeenCalledWith(
        jasmine.stringContaining('3 título(s) da planilha: 1 documento(s) no lote, 1 sem documento, 1 com divergência'),
        'Planilha', jasmine.anything());
      componente.fecharImportacao();
      expect(componente.linhasImportacao.length).toBe(0);
    });

    it('tudo encontrado: sucesso e nada para olhar', () => {
      const { componente, toastr, input } = telaImportacao(of({ documentos: [nota(1)], linhas: [linha(1, 'ENCONTRADO')] }));
      componente.importarPlanilha(input);
      expect(toastr.success).toHaveBeenCalled();
      expect(componente.linhasImportacao.length).toBe(0);
    });

    it('nenhum documento: avisa e o lote nao muda', () => {
      const { componente, toastr, input } = telaImportacao(of({ documentos: [], linhas: [linha(1, 'NAO_ENCONTRADO')] }));
      componente.importarPlanilha(input);
      expect(componente.notasDoLote.length).toBe(0);
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('Nenhum dos 1 título(s)'));
      expect(componente.linhasImportacao.length).toBe(1);
    });

    it('arquivo que nao e .xlsx nem vai para o servidor', () => {
      const { componente, toastr, input, chamadas } = telaImportacao(of({ documentos: [], linhas: [] }));
      input.files = [new File(['x'], 'titulos.xls')];
      componente.importarPlanilha(input);
      expect(chamadas.length).toBe(0);
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('.xlsx'));
    });

    it('durante a importacao o lote, o download e a troca esperam; a resposta entra no lote', () => {
      const resposta = new Subject<any>();
      const { componente, chamadas, input, toastr } = telaImportacao(resposta);
      componente.importarPlanilha(input);
      expect(componente.importando).toBeTrue();
      componente.baixar();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      componente.action({ type: 'nota-lote-toggle-selecao', data: nota(99) } as any);
      expect(chamadas.length).toBe(1);
      expect(componente.baixando).toBeFalse();
      expect(componente.notasDoLote.length).toBe(0);
      expect(toastr.info).toHaveBeenCalledWith(jasmine.stringContaining('importação da planilha'));
      resposta.next({ documentos: [nota(250976)], linhas: [linha(1, 'ENCONTRADO')] });
      expect(componente.notasDoLote.map((n) => n.chave)).toEqual(['NF-250976']);
    });

    it('com o adicionar todas pendente a importacao espera', () => {
      const { componente, input, chamadas, toastr } = telaImportacao(of({ documentos: [], linhas: [] }));
      componente.selecionandoFiltro = true;
      componente.importarPlanilha(input);
      expect(chamadas.length).toBe(0);
      expect(toastr.info).toHaveBeenCalledWith(jasmine.stringContaining('Adicionar todas do filtro'));
    });

    it('erro do servidor libera o botao', () => {
      const { componente, input } = telaImportacao(throwError(() => new Error('x')));
      componente.importarPlanilha(input);
      expect(componente.importando).toBeFalse();
    });
  });

  describe('troca da forma de pagamento', () => {
    function telaTroca(resultados: any[] | Subject<any[]>, opcoes: { confirma?: boolean } = {}) {
      const chamadas = { troca: [] as any[], listar: 0 };
      // O que o SAP tem gravado: a lista recarregada depois da troca devolve a forma nova.
      const formaNoSap: { [docEntry: number]: string } = {};
      const service = {
        getDefinition: () => [], statusSefaz: () => of([]), formasPagamento: () => of(FORMAS),
        listar: () => {
          chamadas.listar++;
          return of(pagina([nota(1), nota(2)].map((n) => Object.assign(n, { formaPagamento: formaNoSap[n.docEntry] }))));
        },
        trocarFormaPagamento: (forma: string, documentos: NotaFiscalLote[]) => {
          chamadas.troca.push({ forma, chaves: documentos.map((d) => d.chave) });
          if (Array.isArray(resultados)) {
            resultados.filter((x) => ['ATUALIZADO', 'VINCULADO_E_ATUALIZADO', 'SEM_MUDANCA'].includes(x.situacao))
              .forEach((x) => (formaNoSap[x.docEntry] = forma));
            return of(resultados);
          }
          return resultados;
        },
      } as any;
      const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'error', 'info']);
      const componente = novoComponente(service, toastr, opcoes);
      componente.ngOnInit();
      return { componente, chamadas, toastr };
    }
    const r = (docEntry: number, situacao: string, extra: any = {}) =>
      ({ tipo: 'NF', categoria: 'NF', docEntry, numero: docEntry + 500, cardCode: 'C1', cardName: 'Cliente C1', formaAnterior: 'AVISTA',
        situacao, mensagem: null, boletoAtivo: false, ...extra });

    it('resultado separa a categoria de cada documento', () => {
      const { componente } = telaTroca([]);
      expect(componente.categoriaDo(r(1, 'ERRO', { categoria: 'NF_FUTURA' }) as any).rotulo).toBe('NF-e venda futura');
      expect(componente.categoriaDo(r(1, 'NAO_ENCONTRADO', { categoria: null, tipo: 'AD' }) as any).rotulo).toBe('Adiant. venda futura');
    });

    it('carrega as formas de recebimento para escolher', () => {
      expect(telaTroca([]).componente.formasPagamento.map((f) => f.codigo)).toEqual(['AVISTA', 'pix-vencimento']);
    });

    it('sem forma escolhida ou com lote vazio nao chama', fakeAsync(() => {
      const { componente, chamadas, toastr } = telaTroca([]);
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = '';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect(chamadas.troca.length).toBe(0);
      expect(toastr.warning).toHaveBeenCalledTimes(2);
    }));

    it('confirmacao cancelada nao grava nada', fakeAsync(() => {
      const { componente, chamadas } = telaTroca([], { confirma: false });
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect(chamadas.troca.length).toBe(0);
    }));

    it('aplica no lote inteiro, atualiza a forma mostrada e recarrega a lista', fakeAsync(() => {
      const { componente, chamadas, toastr } = telaTroca([r(1, 'ATUALIZADO'), r(2, 'VINCULADO_E_ATUALIZADO')]);
      componente.alternarSelecaoDaPagina();
      const listagensAntes = chamadas.listar;
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect(chamadas.troca).toEqual([{ forma: 'pix-vencimento', chaves: ['NF-1', 'NF-2'] }]);
      expect(componente.notasDoLote.map((n) => n.formaPagamento)).toEqual(['pix-vencimento', 'pix-vencimento']);
      expect(componente.quantidadeTrocada).toBe(2);
      expect(chamadas.listar).toBe(listagensAntes + 1);
      expect(toastr.success).toHaveBeenCalled();
    }));

    it('mostra so o que pede atencao: erro, nao encontrado e boleto ativo', fakeAsync(() => {
      const { componente, toastr } = telaTroca([
        r(1, 'ATUALIZADO', { boletoAtivo: true, mensagem: 'ainda tem 1 boleto(s) ativo(s) na BankPlus' }),
        r(2, 'ERRO', { mensagem: 'Document is already closed' }),
      ]);
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect(componente.resultadosComAtencao.map((x) => x.docEntry)).toEqual([1, 2]);
      // a nota com erro continua com a forma antiga no lote
      expect(componente.notasDoLote.find((n) => n.docEntry === 2)?.formaPagamento).toBeUndefined();
      expect(toastr.warning).toHaveBeenCalled();
      expect(toastr.info).toHaveBeenCalled();
      componente.fecharResultadosTroca();
      expect(componente.resultadosTroca.length).toBe(0);
    }));

    it('ja estava com a forma: o lote mostra a forma confirmada pelo SAP, mesmo fora da pagina', fakeAsync(() => {
      const { componente } = telaTroca([r(1, 'SEM_MUDANCA'), r(2, 'ATUALIZADO')]);
      componente.alternarSelecaoDaPagina();
      // documentos de outra busca: a lista recarregada nao os traz
      spyOn(componente, 'carregarPagina');
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect(componente.notasDoLote.map((n) => n.formaPagamento)).toEqual(['pix-vencimento', 'pix-vencimento']);
      expect(componente.quantidadeTrocada).toBe(1);
    }));

    it('sem confirmacao (prazo acabou gravando) pede atencao, avisa para conferir e nao muda a forma', fakeAsync(() => {
      const { componente, toastr } = telaTroca([
        r(1, 'SEM_CONFIRMACAO', { mensagem: 'o prazo da troca (300s) acabou' }),
        r(2, 'ATUALIZADO'),
      ]);
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect(componente.resultadosComAtencao.map((x) => x.docEntry)).toEqual([1]);
      expect(componente.notasDoLote.find((n) => n.docEntry === 1)?.formaPagamento).toBeUndefined();
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('1 sem confirmação'), jasmine.anything(), jasmine.anything());
      expect(toastr.warning.calls.mostRecent().args[0]).not.toContain('com erro');
      expect(toastr.success).not.toHaveBeenCalled();
    }));

    it('troca com pendencia (forma nao vinculada ao parceiro) nao da aviso de sucesso', fakeAsync(() => {
      const { componente, toastr } = telaTroca([
        r(1, 'ATUALIZADO', { pendencia: true, mensagem: 'forma NAO vinculada ao parceiro (Business partner is locked)' }),
        r(2, 'ATUALIZADO'),
      ]);
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect(toastr.success).not.toHaveBeenCalled();
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('1 com pendência'), jasmine.anything(), jasmine.anything());
      expect(componente.resultadosComAtencao.map((x) => x.docEntry)).toEqual([1]);
    }));

    it('sem resposta do backend avisa que pode ter gravado e recarrega; recusa do backend nao', fakeAsync(() => {
      for (const [status, avisa] of [[504, true], [0, true], [400, false]] as [number, boolean][]) {
        // cada volta e uma tela nova: o lote da volta anterior nao pode ser restaurado
        sessionStorage.removeItem(CHAVE);
        const { componente, chamadas, toastr } = telaTroca(throwError(() => new HttpErrorResponse({ status })) as any);
        componente.alternarSelecaoDaPagina();
        const listagensAntes = chamadas.listar;
        componente.formaEscolhida = 'pix-vencimento';
        componente.trocarFormaPagamento();
        flushMicrotasks();
        expect(componente.trocandoForma).toBeFalse();
        expect(toastr.warning.calls.count()).withContext(`status ${status}`).toBe(avisa ? 1 : 0);
        expect(chamadas.listar).withContext(`status ${status}`).toBe(listagensAntes + (avisa ? 1 : 0));
      }
    }));

    it('NF de venda futura antiga: a confirmacao avisa que fica de fora e conta so o resto', fakeAsync(() => {
      const { componente, chamadas, toastr } = telaTroca([
        r(1, 'NAO_PERMITIDO', { categoria: 'NF_FUTURA', mensagem: 'o SAP nao deixa' }),
        r(2, 'ATUALIZADO'),
      ]);
      componente.notas[0].categoria = 'NF_FUTURA';
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      const texto = (componente as any).alert.confirm.calls.mostRecent().args[0];
      expect(texto).toContain('de 1 documento(s)');
      expect(texto).toContain('1 NF(s) de venda futura do padrão antigo ficam de fora');
      // o backend recebe o lote inteiro e decide
      expect(chamadas.troca).toEqual([{ forma: 'pix-vencimento', chaves: ['NF-1', 'NF-2'] }]);
      // ja avisado: nao e problema, mas aparece no resultado
      expect(toastr.success).toHaveBeenCalledWith(jasmine.stringContaining('1 NF(s) de venda futura antiga de fora'), jasmine.anything());
      expect(componente.resultadosComAtencao.map((x) => x.docEntry)).toEqual([1]);
      expect(componente.notasDoLote.find((n) => n.docEntry === 1)?.formaPagamento).toBeUndefined();
    }));

    it('lote so de NF de venda futura antiga nem pede confirmacao', fakeAsync(() => {
      const { componente, chamadas, toastr } = telaTroca([]);
      componente.notas.forEach((n) => (n.categoria = 'NF_FUTURA'));
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect((componente as any).alert.confirm).not.toHaveBeenCalled();
      expect(chamadas.troca.length).toBe(0);
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('venda futura do padrão antigo'));
      expect((componente as any).confirmandoTroca).toBeFalse();
    }));

    it('NF de venda futura antiga que ja esta com a forma escolhida nao conta como fora', fakeAsync(() => {
      const { componente } = telaTroca([r(1, 'SEM_MUDANCA'), r(2, 'ATUALIZADO')]);
      componente.notas[0].categoria = 'NF_FUTURA';
      componente.notas[0].formaPagamento = 'pix-vencimento';
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect((componente as any).alert.confirm.calls.mostRecent().args[0]).not.toContain('ficam de fora');
    }));

    describe('com a confirmacao aberta', () => {
      // Confirmacao que o teste responde quando quiser; troca espionada.
      function telaConfirmando() {
        const t = telaAssincrona();
        let responder!: (r: any) => void;
        let recusar!: (e: any) => void;
        (t.componente as any).alert.confirm.and.returnValue(new Promise((ok, falha) => { responder = ok; recusar = falha; }));
        const troca = jasmine.createSpy('trocarFormaPagamento').and.returnValue(of([]));
        (t.componente as any).service.trocarFormaPagamento = troca;
        t.responde(0, pagina([nota(1), nota(2)], 3));
        t.componente.action({ type: 'nota-lote-toggle-selecao', data: t.componente.notas[0] } as any);
        t.componente.formaEscolhida = 'pix-vencimento';
        return { ...t, troca, responder: (resposta: any) => responder(resposta), recusar: (e: any) => recusar(e) };
      }

      it('o lote nao muda, o adicionar todas pendente cai e grava so o que foi confirmado', fakeAsync(() => {
        const { componente, pendentes, responde, troca, responder } = telaConfirmando();
        componente.adicionarTodasDoFiltro();
        componente.trocarFormaPagamento();
        responde(1, pagina([nota(1), nota(2), nota(3)]));
        componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[1] } as any);
        componente.remover('NF-1');
        expect(pendentes[1].resposta.observed).toBeFalse();
        expect(componente.notasDoLote.map((n) => n.chave)).toEqual(['NF-1']);

        responder({ isConfirmed: true });
        flushMicrotasks();
        expect(troca).toHaveBeenCalledTimes(1);
        expect(troca.calls.mostRecent().args[1].map((n: NotaFiscalLote) => n.chave)).toEqual(['NF-1']);
      }));

      it('confirmada depois de sair da tela nao grava', fakeAsync(() => {
        const { componente, troca, responder } = telaConfirmando();
        componente.trocarFormaPagamento();
        componente.ngOnDestroy();
        responder({ isConfirmed: true });
        flushMicrotasks();
        expect(troca).not.toHaveBeenCalled();
      }));

      it('cancelada destrava o lote', fakeAsync(() => {
        const { componente, troca, responder } = telaConfirmando();
        componente.trocarFormaPagamento();
        responder({ isConfirmed: false });
        flushMicrotasks();
        componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[1] } as any);
        expect(componente.notasDoLote.map((n) => n.chave)).toEqual(['NF-1', 'NF-2']);
        expect(troca).not.toHaveBeenCalled();
      }));

      it('dialogo que falha destrava o lote', fakeAsync(() => {
        const { componente, troca, recusar } = telaConfirmando();
        componente.trocarFormaPagamento();
        recusar(new Error('fechou'));
        flushMicrotasks();
        componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[1] } as any);
        expect(componente.notasDoLote.length).toBe(2);
        expect(troca).not.toHaveBeenCalled();
      }));
    });

    it('durante a troca o lote nao muda e o download espera', fakeAsync(() => {
      const resposta = new Subject<any[]>();
      const { componente } = telaTroca(resposta);
      componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[0] } as any);
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      expect(componente.trocandoForma).toBeTrue();
      componente.action({ type: 'nota-lote-toggle-selecao', data: componente.notas[1] } as any);
      componente.remover('NF-1');
      componente.baixar();
      expect(componente.notasDoLote.map((n) => n.docEntry)).toEqual([1]);
      expect(componente.baixando).toBeFalse();
      resposta.next([r(1, 'ATUALIZADO')]);
      resposta.complete();
      expect(componente.trocandoForma).toBeFalse();
    }));

    it('sair da tela durante a troca cancela a resposta', fakeAsync(() => {
      const resposta = new Subject<any[]>();
      const { componente, toastr } = telaTroca(resposta);
      componente.alternarSelecaoDaPagina();
      componente.formaEscolhida = 'pix-vencimento';
      componente.trocarFormaPagamento();
      flushMicrotasks();
      componente.ngOnDestroy();
      resposta.next([r(1, 'ATUALIZADO')]);
      expect(toastr.success).not.toHaveBeenCalled();
    }));
  });

  it('JSON com um campo chave nao quebra a montagem da nota', () => {
    const n = NotaFiscalLote.from({ tipo: 'AD', docEntry: 7, chave: { tipo: 'AD', docEntry: 7 } });
    expect(n.chave).toBe('AD-7');
  });

  it('falha que nao e HTTP ao montar a lista avisa em vez de mostrar lista vazia', () => {
    const service = {
      getDefinition: () => [], statusSefaz: () => of([]),
      listar: () => throwError(() => new TypeError('Cannot set property chave')),
    } as any;
    const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'error', 'info']);
    spyOn(console, 'error');
    const componente = novoComponente(service, toastr);
    componente.ngOnInit();
    expect(toastr.error).toHaveBeenCalled();
    expect(componente.loading).toBeFalse();
  });

  it('formata nota sem numero pelo documento', () => {
    expect(NotaFiscalLote.from({ docEntry: 9, docNum: 77 }).notaFormatada).toBe('Doc. 77');
    expect(nota(1, 501).notaFormatada).toBe('501 / 2');
    expect(nota(1).dataFormatada).toBe('30/09/2026');
  });
});
