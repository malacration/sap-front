import { HttpErrorResponse } from '@angular/common/http';
import { Directive, NO_ERRORS_SCHEMA, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { BsModalService } from 'ngx-bootstrap/modal';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ToastrService } from '../../../core/services/toastr.service';
import { AlertService } from '../../../shared/service/alert.service';
import { AuthService } from '../../../shared/service/auth.service';
import { LogoService } from '../../../core/services/logo.service';
import { Observable, Subject, of, throwError } from 'rxjs';
import { NotaFiscalLoteComponent } from './nota-fiscal-lote.component';
import { NotaFiscalLoteStorageService } from '../../../sap/service/fiscal/nota-fiscal-lote-storage.service';
import { NotaFiscalLote } from '../../../sap/model/fiscal/nota-fiscal-lote';
import { NotaFiscalLoteService } from '../../../sap/service/fiscal/nota-fiscal-lote.service';
import { Page } from '../../../sap/model/page.model';
import { BusinessPartnerDefinition } from '../../../sap/model/business-partner/business-partner-definition';

// Os componentes de busca/data do filtro (NO_ERRORS_SCHEMA) nao tem accessor: este no-op evita o NG01203.
@Directive({
  selector: 'app-input-date[ngModel], app-search[ngModel], app-select[ngModel], [ngModel]:not(input):not(select):not(textarea)',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SemAccessorStub), multi: true }],
  standalone: false,
})
class SemAccessorStub implements ControlValueAccessor {
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

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
    service.statusBoleto ??= () => of([{ id: 3, descricao: 'Confirmado' }]);
    service.trocarFormaPagamento ??= () => of([]);
    service.cessionarias ??= () => of([{ codigo: 'C1', nome: 'Securitizadora Um' }]);
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
    // so a parcela clicada fica marcada (e e a que vai no termo); o documento continua um so no lote
    expect(componente.notas.map((n) => n.selecionado)).toEqual([false, true, false]);
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

    describe('termo de cessao', () => {
      function telaTermo() {
        const chamadas: any[] = [];
        const service = {
          getDefinition: () => [], statusSefaz: () => of([]), listar: () => of(pagina([nota(1)])),
          cessionarias: jasmine.createSpy('cessionarias').and.returnValue(of([{ codigo: 'C1', nome: 'Securitizadora Um' }])),
          baixar: (...args: any[]) => {
            chamadas.push(args);
            return of({ arquivo: null, nome: 'n.zip', notasComErro: 0, notasSemBoleto: 0 });
          },
        } as any;
        const toastr = jasmine.createSpyObj('ToastrService', ['warning', 'success', 'info']);
        const componente = novoComponente(service, toastr);
        componente.ngOnInit();
        componente.alternarSelecaoDaPagina();
        return { componente, service, chamadas, toastr };
      }

      it('conta as notas fechadas/canceladas do lote (adiantamento nao conta)', () => {
        const { componente } = telaTermo();
        const nf = (docEntry: number, statusSap: any, tipo: any = 'NF') => Object.assign(nota(docEntry), { statusSap, tipo });
        const selecao: Map<string, NotaFiscalLote> = (componente as any).selecao;
        selecao.set('a', nf(1, 'FECHADO'));
        selecao.set('b', nf(2, 'CANCELADO'));
        selecao.set('c', nf(3, 'ABERTO'));
        selecao.set('d', nf(4, 'FECHADO', 'AD'));
        expect(componente.notasFechadasNoLote).toBe(2);
      });

      describe('nova cessionaria', () => {
        function telaNova() {
          const tela = telaTermo();
          const modal = jasmine.createSpyObj('ModalComponent', ['openModal', 'closeModal']);
          const modelo = { control: jasmine.createSpyObj('FormControl', ['setValue']) } as any;
          const criar = new Subject<any>();
          tela.componente.modalCessionaria = modal;
          tela.service.criarCessionaria = jasmine.createSpy('criarCessionaria').and.returnValue(criar);
          tela.componente.cessionaria = 'C1';
          tela.componente.novaCessionaria = { nome: ' Nova ', nomePdf: ' Nova Securitizadora S.A. ', cnpj: '12.345.678/0001-95' };
          return { ...tela, modal, modelo, criar };
        }
        const nova = { codigo: 'C2', nome: 'Nova' };

        it('a opcao "+ Nova" abre o modal e devolve o controle a escolha anterior', () => {
          const { componente, modal, modelo } = telaNova();
          componente.escolherCessionaria(componente.NOVA_CESSIONARIA, modelo);
          expect(modal.openModal).toHaveBeenCalled();
          expect(componente.cessionaria).toBe('C1');
          expect(modelo.control.setValue).toHaveBeenCalledWith('C1', { emitEvent: false });
        });

        it('com salvamento pendente nao abre outro modal', () => {
          const { componente, modal, modelo } = telaNova();
          componente.salvarCessionaria();
          componente.escolherCessionaria(componente.NOVA_CESSIONARIA, modelo);
          expect(modal.openModal).not.toHaveBeenCalled();
          expect(modelo.control.setValue).toHaveBeenCalledWith('C1', { emitEvent: false });
        });

        it('seleciona a nova com a resposta do POST, antes da recarga terminar', () => {
          const { componente, service, modal, criar } = telaNova();
          const recarga = new Subject<any>();
          service.cessionarias.and.returnValue(recarga);
          componente.salvarCessionaria();
          expect(service.criarCessionaria).toHaveBeenCalledWith(
            { nome: 'Nova', nomePdf: 'Nova Securitizadora S.A.', cnpj: '12.345.678/0001-95' });
          criar.next(nova);
          expect(modal.closeModal).toHaveBeenCalled();
          expect(componente.cessionaria).toBe('C2');
          expect(componente.cessionarias.map((c) => c.codigo)).toContain('C2');
          recarga.next([{ codigo: 'C1', nome: 'Um' }, { codigo: 'C2', nome: 'Nova' }]);
          expect(componente.cessionarias.map((c) => c.codigo)).toEqual(['C1', 'C2']);
          expect(componente.cessionaria).toBe('C2');
        });

        it('recarga que falha mantem a selecao e libera nova tentativa de carga', () => {
          const { componente, service, criar } = telaNova();
          service.cessionarias.and.returnValue(throwError(() => new Error('falhou')));
          componente.salvarCessionaria();
          criar.next(nova);
          expect(componente.cessionaria).toBe('C2');
          expect(componente.cessionarias.map((c) => c.codigo)).toContain('C2');
          service.cessionarias.calls.reset();
          componente.baixarTermo = true;
          componente.onTermoChange();
          expect(service.cessionarias).toHaveBeenCalledTimes(1);
        });

        it('GET mais velho que o POST, chegando por ultimo, e ignorado', () => {
          const { componente, service, criar } = telaNova();
          const inicial = new Subject<any>();
          const recarga = new Subject<any>();
          service.cessionarias.and.returnValues(inicial, recarga);
          componente.baixarTermo = true;
          componente.onTermoChange(); // GET antigo, ainda pendente
          componente.salvarCessionaria();
          criar.next(nova);
          recarga.next([{ codigo: 'C1', nome: 'Um' }, { codigo: 'C2', nome: 'Nova' }]);
          inicial.next([{ codigo: 'C1', nome: 'Um' }]); // resposta velha, sem a nova
          expect(componente.cessionarias.map((c) => c.codigo)).toEqual(['C1', 'C2']);
          expect(componente.cessionaria).toBe('C2');
        });

        it('(a) cria B e edita B com o GET inicial pendente: lista completa chega na ultima recarga', () => {
          const { componente, service, criar } = telaNova();
          const [inicial, recargaPost, recargaPatch] = [new Subject<any>(), new Subject<any>(), new Subject<any>()];
          service.cessionarias.and.returnValues(inicial, recargaPost, recargaPatch);
          service.editarCessionaria = jasmine.createSpy('editarCessionaria').and.returnValue(of({ codigo: 'C2', nome: 'Nova 2' }));
          componente.baixarTermo = true;
          componente.onTermoChange();
          componente.salvarCessionaria();
          criar.next(nova);
          componente.editandoCodigo = 'C2';
          componente.salvarCessionaria(); // PATCH
          expect(componente.cessionarias.map((c) => c.nome)).toEqual(['Nova 2']);
          inicial.next([{ codigo: 'C1', nome: 'Um' }]);
          recargaPost.next([{ codigo: 'C1', nome: 'Um' }, { codigo: 'C2', nome: 'Nova' }]);
          expect(componente.cessionarias.map((c) => c.nome)).toEqual(['Nova 2']); // ainda so a local
          recargaPatch.next([{ codigo: 'C1', nome: 'Um' }, { codigo: 'C2', nome: 'Nova 2' }]);
          expect(componente.cessionarias.map((c) => c.codigo)).toEqual(['C1', 'C2']);
          expect(componente.cessionaria).toBe('C2');
        });

        it('(b) cria A, cria B, reseleciona A; GET inicial por ultimo nao tira A da lista', () => {
          const { componente, service, criar } = telaNova();
          const [inicial, r1, r2] = [new Subject<any>(), new Subject<any>(), new Subject<any>()];
          service.cessionarias.and.returnValues(inicial, r1, r2);
          componente.baixarTermo = true;
          componente.onTermoChange();
          componente.salvarCessionaria();
          criar.next({ codigo: 'A', nome: 'A' });
          const criarB = new Subject<any>();
          service.criarCessionaria.and.returnValue(criarB);
          componente.salvarCessionaria();
          criarB.next({ codigo: 'B', nome: 'B' });
          componente.escolherCessionaria('A', {} as any);
          r1.next([{ codigo: 'A', nome: 'A' }]);
          r2.next([{ codigo: 'A', nome: 'A' }, { codigo: 'B', nome: 'B' }]);
          inicial.next([{ codigo: 'C1', nome: 'Um' }]);
          expect(componente.cessionarias.map((c) => c.codigo)).toEqual(['A', 'B']);
          expect(componente.cessionaria).toBe('A');
        });

        it('ultimo GET que falha libera nova carga ao remarcar o termo', () => {
          const { componente, service, criar } = telaNova();
          const recarga = new Subject<any>();
          service.cessionarias.and.returnValue(recarga);
          componente.salvarCessionaria();
          criar.next(nova);
          recarga.error(new Error('falhou'));
          service.cessionarias.calls.reset();
          componente.baixarTermo = true;
          componente.onTermoChange();
          expect(service.cessionarias).toHaveBeenCalledTimes(1);
        });

        it('POST que resolve depois de o usuario escolher outra cessionaria mantem a escolha dele', () => {
          const { componente, service, modal, criar } = telaNova();
          const recarga = new Subject<any>();
          service.cessionarias.and.returnValue(recarga);
          componente.salvarCessionaria();
          componente.escolherCessionaria('C1', {} as any);
          criar.next(nova);
          expect(componente.cessionaria).toBe('C1');
          expect(componente.cessionarias.map((c) => c.codigo)).toContain('C2');
          expect(service.cessionarias).toHaveBeenCalled(); // a lista e recarregada mesmo assim
          expect(modal.closeModal).toHaveBeenCalled();
        });

        it('POST que resolve depois de o modal ser fechado mantem a escolha do usuario', () => {
          const { componente, service, criar } = telaNova();
          service.cessionarias.and.returnValue(new Subject<any>());
          componente.salvarCessionaria();
          componente.modalCessionariaFechado();
          criar.next(nova);
          expect(componente.cessionaria).toBe('C1');
          expect(componente.cessionarias.map((c) => c.codigo)).toContain('C2');
        });

        it('POST/GET que chegam depois de destruir a tela nao mexem em nada', () => {
          const { componente, service, modal, criar } = telaNova();
          const recarga = new Subject<any>();
          service.cessionarias.and.returnValue(recarga);
          componente.salvarCessionaria();
          componente.ngOnDestroy();
          modal.closeModal.calls.reset(); // o fechamento do proprio destroy nao conta
          criar.next(nova);
          expect(modal.closeModal).not.toHaveBeenCalled();
          expect(service.cessionarias).not.toHaveBeenCalled();
          expect(componente.cessionaria).toBe('C1');
        });

        it('erro no POST destrava o Salvar e mantem o modal aberto', () => {
          const { componente, modal, criar } = telaNova();
          componente.salvarCessionaria();
          criar.error(new Error('409'));
          expect(componente.salvandoCessionaria).toBeFalse();
          expect(modal.closeModal).not.toHaveBeenCalled();
        });
      });

      describe('editar cessionaria', () => {
        function telaEditar() {
          const tela = telaTermo();
          const modal = jasmine.createSpyObj('ModalComponent', ['openModal', 'closeModal']);
          const modelo = { control: jasmine.createSpyObj('FormControl', ['setValue']) } as any;
          const editar = new Subject<any>();
          tela.componente.modalCessionaria = modal;
          tela.service.editarCessionaria = jasmine.createSpy('editarCessionaria').and.returnValue(editar);
          tela.componente.cessionarias = [{ codigo: '12345678000195', nome: 'Um', nomePdf: 'Um S.A.' }, { codigo: 'C2', nome: 'Dois' }];
          tela.componente.cessionaria = '12345678000195';
          return { ...tela, modal, modelo, editar };
        }

        it('o botao abre preenchido (nome, nomePdf, CNPJ somente leitura) e mantem a selecao', () => {
          const { componente, modal, modelo } = telaEditar();
          componente.editarCessionariaSelecionada();
          expect(modal.openModal).toHaveBeenCalled();
          expect(componente.editandoCodigo).toBe('12345678000195');
          expect(componente.novaCessionaria).toEqual({ nome: 'Um', nomePdf: 'Um S.A.', cnpj: '12.345.678/0001-95' });
          expect(componente.cessionaria).toBe('12345678000195');
        });

        it('regressao: edita so o nome e o PATCH omite o nomePdf (backend mantem)', () => {
          const { componente, service, modelo } = telaEditar();
          // Resposta no formato da API, sem injetar nomePdf no componente.
          componente.cessionarias = [{ codigo: '12345678000195', nome: 'Joao', nomePdf: 'JOÃO DA CONCEIÇÃO' }];
          componente.editarCessionariaSelecionada();
          expect(componente.novaCessionaria.nomePdf).toBe('JOÃO DA CONCEIÇÃO');
          componente.novaCessionaria.nome = 'Joao Novo';
          componente.salvarCessionaria();
          expect(service.editarCessionaria).toHaveBeenCalledWith('12345678000195', { nome: 'Joao Novo' });
        });

        it('limpar o nomePdf envia null', () => {
          const { componente, service, modelo } = telaEditar();
          componente.cessionarias = [{ codigo: '12345678000195', nome: 'Joao', nomePdf: 'JOÃO DA CONCEIÇÃO' }];
          componente.editarCessionariaSelecionada();
          componente.novaCessionaria.nomePdf = '';
          componente.salvarCessionaria();
          expect(service.editarCessionaria).toHaveBeenCalledWith('12345678000195', { nome: 'Joao', nomePdf: null });
        });

        it('selecao de outra cessionaria sem nomePdf abre com nomePdf vazio', () => {
          const { componente, modal } = telaEditar();
          componente.cessionaria = 'C2';
          componente.editarCessionariaSelecionada();
          expect(modal.openModal).toHaveBeenCalled();
          expect(componente.novaCessionaria).toEqual({ nome: 'Dois', nomePdf: '', cnpj: 'C2' });
        });

        it('com salvamento pendente o botao nao abre outro modal', () => {
          const { componente, modal } = telaEditar();
          componente.salvandoCessionaria = true;
          componente.editarCessionariaSelecionada();
          expect(modal.openModal).not.toHaveBeenCalled();
        });

        it('GET superado e cancelado: seu erro tardio nao chega ao interceptor', () => {
          const { componente, service } = telaEditar();
          let canceladoVelho = false;
          const velho = new Observable<any>(() => () => (canceladoVelho = true));
          service.cessionarias.and.returnValues(velho, of([{ codigo: 'C2', nome: 'Dois' }]));
          componente.baixarTermo = true;
          componente.onTermoChange();
          (componente as any).carregarCessionarias();
          expect(canceladoVelho).toBeTrue();
          expect(componente.cessionarias.map((c) => c.codigo)).toEqual(['C2']);
        });

        it('GET atrasado (iniciado antes do PATCH) nao sobrescreve a edicao', () => {
          const { componente, service, modelo, editar } = telaEditar();
          const velho = new Subject<any>();
          const novo = new Subject<any>();
          service.cessionarias.and.returnValues(velho, novo);
          componente.baixarTermo = true;
          componente.onTermoChange();
          componente.editarCessionariaSelecionada();
          componente.novaCessionaria.nome = 'Um Novo';
          componente.salvarCessionaria();
          editar.next({ codigo: '12345678000195', nome: 'Um Novo', nomePdf: 'Um S.A.' });
          velho.next([{ codigo: '12345678000195', nome: 'Um', nomePdf: 'Um S.A.' }, { codigo: 'C2', nome: 'Dois' }]);
          expect(componente.cessionarias.map((c) => c.nome)).toEqual(['Um Novo', 'Dois']);
          novo.next([{ codigo: '12345678000195', nome: 'Um Novo', nomePdf: 'Outro Usuario S.A.' }, { codigo: 'C2', nome: 'Dois' }]);
          expect(componente.cessionarias[0].nomePdf).toBe('Outro Usuario S.A.');
        });

        it('GET iniciado depois do PATCH traz dado mais novo do servidor e prevalece', () => {
          const { componente, service, modelo, editar } = telaEditar();
          service.cessionarias.and.returnValue(of([
            { codigo: '12345678000195', nome: 'Um Novo', nomePdf: 'Outro Usuario S.A.' },
            { codigo: 'C3', nome: 'Tres' },
          ]));
          componente.editarCessionariaSelecionada();
          componente.novaCessionaria.nome = 'Um Novo';
          componente.salvarCessionaria();
          editar.next({ codigo: '12345678000195', nome: 'Um Novo', nomePdf: 'Um S.A.' });
          expect(componente.cessionarias.find((c) => c.codigo === '12345678000195')?.nomePdf).toBe('Outro Usuario S.A.');
          componente.editarCessionariaSelecionada();
          expect(componente.novaCessionaria.nomePdf).toBe('Outro Usuario S.A.');
        });

        it('sem selecao o botao de editar nao abre o modal', () => {
          const { componente, modal, modelo } = telaEditar();
          componente.cessionaria = '';
          componente.editarCessionariaSelecionada();
          expect(modal.openModal).not.toHaveBeenCalled();
        });

        it('"+ Nova" depois de editar volta ao modo criacao', () => {
          const { componente, modelo } = telaEditar();
          componente.editarCessionariaSelecionada();
          componente.escolherCessionaria(componente.NOVA_CESSIONARIA, modelo);
          expect(componente.editandoCodigo).toBeNull();
          expect(componente.novaCessionaria.cnpj).toBe('');
        });

        it('salvar chama PATCH, atualiza a lista, mantem a selecao e avisa', () => {
          const { componente, service, modal, modelo, editar, toastr } = telaEditar();
          service.cessionarias.and.returnValue(of([{ codigo: '12345678000195', nome: 'Um Novo', nomePdf: null }, { codigo: 'C2', nome: 'Dois' }]));
          componente.editarCessionariaSelecionada();
          componente.novaCessionaria.nome = ' Um Novo ';
          componente.novaCessionaria.nomePdf = '  ';
          componente.salvarCessionaria();
          expect(service.editarCessionaria).toHaveBeenCalledWith('12345678000195', { nome: 'Um Novo', nomePdf: null });
          editar.next({ codigo: '12345678000195', nome: 'Um Novo', nomePdf: null });
          expect(componente.cessionarias.map((c) => c.nome)).toEqual(['Um Novo', 'Dois']);
          expect(componente.cessionaria).toBe('12345678000195');
          expect(modal.closeModal).toHaveBeenCalled();
          expect(toastr.success).toHaveBeenCalled();
          expect(componente.salvandoCessionaria).toBeFalse();
        });

        it('mudou o nomePdf: o PATCH envia o novo valor', () => {
          const { componente, service } = telaEditar();
          componente.editarCessionariaSelecionada();
          componente.novaCessionaria.nomePdf = ' Novo S.A. ';
          componente.salvarCessionaria();
          expect(service.editarCessionaria).toHaveBeenCalledWith('12345678000195', { nome: 'Um', nomePdf: 'Novo S.A.' });
        });

        it('sem nomePdf na origem e continua vazio: o PATCH omite o campo', () => {
          const { componente, service } = telaEditar();
          componente.cessionaria = 'C2';
          componente.editarCessionariaSelecionada();
          componente.salvarCessionaria();
          expect(service.editarCessionaria).toHaveBeenCalledWith('C2', { nome: 'Dois' });
        });

        it('PATCH que responde depois de destruir a tela nao avisa nem recarrega', () => {
          const { componente, service, modal, editar, toastr } = telaEditar();
          componente.editarCessionariaSelecionada();
          componente.salvarCessionaria();
          service.cessionarias.calls.reset();
          componente.ngOnDestroy();
          modal.closeModal.calls.reset();
          editar.next({ codigo: '12345678000195', nome: 'Um' });
          expect(toastr.success).not.toHaveBeenCalled();
          expect(modal.closeModal).not.toHaveBeenCalled();
          expect(service.cessionarias).not.toHaveBeenCalled();
        });

        it('GET da lista que responde depois de destruir a tela e descartado', () => {
          const { componente, service } = telaEditar();
          const velho = new Subject<any>();
          service.cessionarias.and.returnValue(velho);
          componente.baixarTermo = true;
          componente.onTermoChange();
          componente.ngOnDestroy();
          velho.next([{ codigo: 'X', nome: 'X' }]);
          expect(componente.cessionarias.map((c) => c.codigo)).toEqual(['12345678000195', 'C2']);
        });

        it('erro no PATCH destrava o Salvar e mantem o modal aberto', () => {
          const { componente, modal, modelo, editar } = telaEditar();
          componente.editarCessionariaSelecionada();
          componente.salvarCessionaria();
          editar.error(new Error('400'));
          expect(componente.salvandoCessionaria).toBeFalse();
          expect(modal.closeModal).not.toHaveBeenCalled();
          expect(componente.cessionarias[0].nome).toBe('Um');
        });
      });

      it('carrega as cessionarias so ao marcar o termo, uma vez', () => {
        const { componente, service } = telaTermo();
        expect(service.cessionarias).not.toHaveBeenCalled();
        componente.baixarTermo = true;
        componente.onTermoChange();
        componente.onTermoChange();
        expect(service.cessionarias).toHaveBeenCalledTimes(1);
        expect(componente.cessionarias.map((c) => c.codigo)).toEqual(['C1']);
      });

      it('lote so de adiantamento com termo vai ao servidor, mas o adiantamento conta como sem arquivo', fakeAsync(() => {
        const { componente, chamadas, toastr } = tela({ 0: pagina([ad(10)]) });
        componente.alternarSelecaoDaPagina();
        componente.baixarPdf = false;
        componente.baixarXml = false;
        componente.baixarTermo = true;
        componente.cessionaria = 'C1';
        componente.baixar();
        flushMicrotasks();
        expect(chamadas.baixar.length).toBe(1);
        expect(toastr.info).toHaveBeenCalledWith(jasmine.stringContaining('1 adiantamento(s) sem arquivo'), 'Adiantamentos', jasmine.anything());
      }));

      it('NF + adiantamento so com termo: mensagem sem contagem de notas', fakeAsync(() => {
        const { componente, toastr } = tela({ 0: pagina([ad(10), nota(1)]) });
        componente.alternarSelecaoDaPagina();
        componente.baixarPdf = false;
        componente.baixarXml = false;
        componente.baixarTermo = true;
        componente.cessionaria = 'C1';
        componente.baixar();
        flushMicrotasks();
        expect(toastr.success).toHaveBeenCalledWith('Lote gerado. Notas sem parcela em aberto aparecem em avisos.txt.');
      }));

      it('termo com outro tipo marcado mantem a contagem de notas', fakeAsync(() => {
        const { componente, toastr } = telaTermo();
        componente.baixarTermo = true;
        componente.cessionaria = 'C1';
        componente.baixar();
        flushMicrotasks();
        expect(toastr.success).toHaveBeenCalledWith('1 nota(s) baixada(s).');
      }));

      describe('parcelas escolhidas', () => {
        const linha = (docEntry: number, parcela: number) =>
          NotaFiscalLote.from({ docEntry, numero: docEntry + 500, parcela, parcelas: 3, total: 10 });

        function telaParcelas(linhas: NotaFiscalLote[], todas?: Page<NotaFiscalLote>) {
          const chamadas: any[] = [];
          const service = {
            getDefinition: () => [], statusSefaz: () => of([]),
            listar: (_f: any, _p: number, size: number) => of(size === NotaFiscalLoteService.LIMITE_LOTE && todas ? todas : pagina(linhas)),
            baixar: (...args: any[]) => {
              chamadas.push(args);
              return of({ arquivo: null, nome: 'n.zip', notasComErro: 0, notasSemBoleto: 0 });
            },
          } as any;
          const componente = novoComponente(service, jasmine.createSpyObj('ToastrService', ['warning', 'success', 'info']));
          componente.ngOnInit();
          componente.baixarTermo = true;
          componente.cessionaria = 'C1';
          return { componente, chamadas };
        }
        const clicar = (c: any, n: NotaFiscalLote) => c.action({ type: 'nota-lote-toggle-selecao', data: n } as any);

        describe('importacao ate o pedido do termo', () => {
          const lin = (situacao: string, parcela: number | null) =>
            ({ linha: 1, nossoNumero: '', beneficiario: '', pagador: 'P', valor: 10, vencimento: '2026-11-16', situacaoBanco: '',
              tipo: 'NF', docEntry: 1, parcela, situacao, mensagem: null });
          // manual = restricao manual [2] no NF 1 antes de importar.
          function importaEBaixa(linhasPlanilha: any[], manual: boolean) {
            sessionStorage.removeItem(CHAVE);
            const t = telaParcelas([linha(1, 1), linha(1, 2), linha(1, 3)]);
            if (manual) {
              clicar(t.componente, t.componente.notas[1]);
            }
            (t.componente as any).service.importarPlanilha = () => of({
              documentos: [NotaFiscalLote.from({ docEntry: 1, numero: 501, total: 10 })], linhas: linhasPlanilha });
            t.componente.importarPlanilha({ files: [new File(['x'], 'p.xlsx')], value: '' } as any);
            t.componente.baixar();
            flushMicrotasks();
            return t.chamadas[0][8];
          }

          it('(a) restricao manual preservada quando o NF volta so com linhas NAO_ENCONTRADO', fakeAsync(() => {
            expect(importaEBaixa([lin('NAO_ENCONTRADO', null)], true)).toEqual([{ docEntry: 1, parcela: 2 }]);
          }));

          it('parcela ilegivel (formula do Excel sem cache) volta NAO_ENCONTRADO com mensagem: restricao manual [2] segue no pedido', fakeAsync(() => {
            const ilegivel = { ...lin('NAO_ENCONTRADO', null), mensagem: 'parcela ilegivel na planilha' };
            expect(importaEBaixa([ilegivel], true)).toEqual([{ docEntry: 1, parcela: 2 }]);
          }));

          it('(b) ENCONTRADO com parcela 2 -> so a 2; com restricao manual [2] e parcela 3 -> 2 e 3', fakeAsync(() => {
            expect(importaEBaixa([lin('ENCONTRADO', 2)], false)).toEqual([{ docEntry: 1, parcela: 2 }]);
            expect(importaEBaixa([lin('ENCONTRADO', 3)], true)).toEqual([{ docEntry: 1, parcela: 2 }, { docEntry: 1, parcela: 3 }]);
          }));

          it('(c) ENCONTRADO com parcela null -> sem entrada (NF inteira)', fakeAsync(() => {
            expect(importaEBaixa([lin('ENCONTRADO', null)], false)).toEqual([]);
            expect(importaEBaixa([lin('ENCONTRADO', null)], true)).toEqual([]);
          }));
        });

        it('manda so as parcelas clicadas; clicar de novo na parcela tira, e em outra soma', fakeAsync(() => {
          const linhas = [linha(1, 1), linha(1, 2), linha(1, 3)];
          const { componente, chamadas } = telaParcelas(linhas);
          clicar(componente, componente.notas[0]);
          clicar(componente, componente.notas[2]);
          clicar(componente, componente.notas[1]);
          clicar(componente, componente.notas[0]);
          expect(componente.notas.map((n) => n.selecionado)).toEqual([false, true, true]);
          componente.baixar();
          flushMicrotasks();
          expect(chamadas[0][8]).toEqual([{ docEntry: 1, parcela: 2 }, { docEntry: 1, parcela: 3 }]);
        }));

        it('selecionar a pagina guarda as parcelas das linhas; tirar a ultima parcela tira o documento', fakeAsync(() => {
          const { componente, chamadas } = telaParcelas([linha(1, 1), linha(1, 2), linha(2, 1)]);
          componente.alternarSelecaoDaPagina();
          componente.baixar();
          flushMicrotasks();
          expect(chamadas[0][8]).toEqual([{ docEntry: 1, parcela: 1 }, { docEntry: 1, parcela: 2 }, { docEntry: 2, parcela: 1 }]);
          clicar(componente, componente.notas[2]);
          expect(componente.quantidadeSelecionada).toBe(1);
        }));

        it('documento adicionado inteiro (todas do filtro) nao manda parcelas', fakeAsync(() => {
          const { componente, chamadas } = telaParcelas([linha(1, 1)], pagina([nota(1), nota(2)]));
          clicar(componente, componente.notas[0]);
          componente.adicionarTodasDoFiltro();
          componente.baixar();
          flushMicrotasks();
          expect(chamadas[0][8]).toEqual([]);
          expect(componente.quantidadeSelecionada).toBe(2);
        }));

        it('sem termo nao manda parcelas', fakeAsync(() => {
          const { componente, chamadas } = telaParcelas([linha(1, 1)]);
          clicar(componente, componente.notas[0]);
          componente.baixarTermo = false;
          componente.baixar();
          flushMicrotasks();
          expect(chamadas[0][8]).toEqual([]);
        }));

        it('documento inteiro (todas do filtro): desmarcar uma parcela mantem as outras (1..N pelo total de parcelas)', fakeAsync(() => {
          const linhas = [linha(1, 1), linha(1, 2), linha(1, 3)];
          const { componente, chamadas } = telaParcelas(linhas, pagina([linha(1, 1)]));
          componente.adicionarTodasDoFiltro();
          clicar(componente, componente.notas[0]);
          expect(componente.quantidadeSelecionada).toBe(1);
          expect(componente.notas.map((n) => n.selecionado)).toEqual([false, true, true]);
          componente.baixar();
          flushMicrotasks();
          expect(chamadas[0][8]).toEqual([{ docEntry: 1, parcela: 2 }, { docEntry: 1, parcela: 3 }]);
          clicar(componente, componente.notas[1]);
          clicar(componente, componente.notas[2]);
          expect(componente.quantidadeSelecionada).toBe(0);
        }));

        it('lote antigo (documento inteiro): desmarcar uma parcela mantem as outras', () => {
          sessionStorage.setItem(CHAVE, JSON.stringify({ v: 2, usuario: 'kc:Fulano', notas: [{ tipo: 'NF', docEntry: 1, parcelas: 3 }] }));
          const { componente } = telaParcelas([linha(1, 1), linha(1, 2), linha(1, 3)]);
          clicar(componente, componente.notas[1]);
          expect(componente.quantidadeSelecionada).toBe(1);
          expect(componente.notas.map((n) => n.selecionado)).toEqual([true, false, true]);
        });

        it('desmarcar a pagina tira so as parcelas dela; as de outra pagina ficam', fakeAsync(() => {
          const paginas = [[linha(1, 1), linha(1, 2)], [linha(1, 3), linha(2, 1)]];
          const chamadas: any[] = [];
          const service = {
            getDefinition: () => [], statusSefaz: () => of([]),
            listar: (_f: any, pg: number) => of(pagina(paginas[pg])),
            baixar: (...args: any[]) => {
              chamadas.push(args);
              return of({ arquivo: null, nome: 'n.zip', notasComErro: 0, notasSemBoleto: 0 });
            },
          } as any;
          const componente = novoComponente(service, jasmine.createSpyObj('ToastrService', ['warning', 'success', 'info']));
          componente.ngOnInit();
          componente.baixarTermo = true;
          componente.cessionaria = 'C1';
          componente.alternarSelecaoDaPagina();
          componente.carregarPagina(1);
          componente.alternarSelecaoDaPagina();
          componente.carregarPagina(0);
          expect(componente.todasDaPaginaSelecionadas).toBeTrue();
          componente.alternarSelecaoDaPagina();
          expect(componente.quantidadeSelecionada).toBe(2);
          componente.baixar();
          flushMicrotasks();
          expect(chamadas[0][8]).toEqual([{ docEntry: 1, parcela: 3 }, { docEntry: 2, parcela: 1 }]);
        }));

        it('as parcelas escolhidas sobrevivem ao recarregar a tela; lote antigo (sem o campo) volta inteiro', fakeAsync(() => {
          const { componente } = telaParcelas([linha(1, 2)]);
          clicar(componente, componente.notas[0]);
          expect(JSON.parse(sessionStorage.getItem(CHAVE)!).notas[0].parcelasTermo).toEqual([2]);
          const { componente: outra, chamadas } = telaParcelas([]);
          outra.baixar();
          flushMicrotasks();
          expect(chamadas[0][8]).toEqual([{ docEntry: 1, parcela: 2 }]);

          sessionStorage.setItem(CHAVE, JSON.stringify({ v: 2, usuario: 'kc:Fulano', notas: [{ tipo: 'NF', docEntry: 5 }] }));
          const { componente: antiga, chamadas: chamadasAntigas } = telaParcelas([]);
          expect(antiga.quantidadeSelecionada).toBe(1);
          antiga.baixar();
          flushMicrotasks();
          expect(chamadasAntigas[0][8]).toEqual([]);
        }));
      });

      it('desmarcar o termo limpa a cessionaria escolhida', () => {
        const { componente } = telaTermo();
        componente.baixarTermo = true;
        componente.cessionaria = 'C1';
        componente.baixarTermo = false;
        componente.onTermoChange();
        expect(componente.cessionaria).toBe('');
      });

      it('termo sem cessionaria nao vai ao servidor', () => {
        const { componente, chamadas, toastr } = telaTermo();
        componente.baixarTermo = true;
        componente.baixar();
        expect(chamadas.length).toBe(0);
        expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('cessionária'));
      });

      it('com cessionaria, o pedido leva termo e cessionaria', fakeAsync(() => {
        const { componente, chamadas } = telaTermo();
        componente.baixarTermo = true;
        componente.cessionaria = 'C1';
        componente.baixar();
        flushMicrotasks();
        const [, , , , , , termo, cessionaria] = chamadas[0];
        expect([termo, cessionaria]).toEqual([true, 'C1']);
      }));

      it('sem termo, vai termo=false e cessionaria nula mesmo com uma escolhida antes', () => {
        const { componente, chamadas } = telaTermo();
        componente.cessionaria = 'C1';
        componente.baixar();
        const [, , , , , , termo, cessionaria] = chamadas[0];
        expect([termo, cessionaria]).toEqual([false, null]);
      });

      it('boleto e termo juntos avisam do boleto do Banco do Brasil, mas baixam', fakeAsync(() => {
        const { componente, chamadas, toastr } = telaTermo();
        componente.baixarBoleto = true;
        componente.baixarTermo = true;
        componente.cessionaria = 'C1';
        componente.baixar();
        flushMicrotasks();
        expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('Banco do Brasil'), jasmine.anything(), jasmine.anything());
        expect(chamadas.length).toBe(1);
      }));
    });

    it('forma de pagamento com nome e boleto da BankPlus com status e situacao', () => {
      const n = NotaFiscalLote.from({ docEntry: 1, formaPagamento: 'AVISTA', formaPagamentoNome: 'DEPOSITO',
        boletoStatusId: 3, boletoStatus: 'Confirmado', boletoSituacao: 'Normal', nossoNumero: '35158540000021002' });
      expect(n.formaPagamentoFormatada).toBe('DEPOSITO (AVISTA)');
      expect(n.boletoFormatado).toBe('Confirmado · Normal');
      expect(NotaFiscalLote.from({ docEntry: 2, formaPagamento: 'X' }).formaPagamentoFormatada).toBe('X');
      expect(NotaFiscalLote.from({ docEntry: 2 }).formaPagamentoFormatada).toBe('');
      expect(NotaFiscalLote.from({ docEntry: 2 }).boletoFormatado).toBe('');
      expect(NotaFiscalLote.from({ docEntry: 2, boletoStatusId: 4, boletoStatus: 'Baixado' }).boletoFormatado).toBe('Baixado');
    });

    it('filtros de forma de pagamento e de boleto vao para a busca; limpar zera', () => {
      const { componente, chamadas } = tela({ 0: pagina([nota(1)]) });
      componente.filtroFormaPagamento = '-';
      componente.filtroBoletoStatus = '-1';
      componente.filtrar();
      const filtro = chamadas.listar[chamadas.listar.length - 1].filtro;
      expect(filtro.formaPagamento).toBe('-');
      expect(filtro.boletoStatus).toBe(-1);
      expect(componente.statusBoletoOpcoes.map((s) => s.id)).toEqual([3]);
      componente.limparFiltros();
      const limpo = chamadas.listar[chamadas.listar.length - 1].filtro;
      expect(limpo.formaPagamento).toBeNull();
      expect(limpo.boletoStatus).toBeNull();
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

    it('envia so o modo ao servico; AMBIGUO fica na lista, com rotulo, e conta como sem documento', () => {
      const argumentos: any[][] = [];
      const { componente, toastr, input } = telaImportacao(of({
        documentos: [nota(250976)],
        linhas: [linha(1, 'ENCONTRADO'), linha(2, 'AMBIGUO', { tipo: null, docEntry: null, mensagem: 'filial 1 serie 2; filial 3 serie 2' })],
      }));
      (componente as any).service.importarPlanilha = (...a: any[]) => { argumentos.push(a); return of({
        documentos: [nota(250976)],
        linhas: [linha(1, 'ENCONTRADO'), linha(2, 'AMBIGUO', { tipo: null, docEntry: null, mensagem: 'filial 1 serie 2; filial 3 serie 2' })],
      }); };
      componente.modoImportacao = 'NUMERO_NOTA';
      componente.importarPlanilha(input);
      expect(argumentos[0][1]).toBe('NUMERO_NOTA');
      expect(argumentos[0].length).toBe(2);
      expect(componente.linhasImportacao.map((l) => l.situacao)).toEqual(['AMBIGUO']);
      expect(componente.situacaoImportacaoRotulo['AMBIGUO']).toBe('Ambígua');
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('1 sem documento'), 'Planilha', jasmine.anything());
    });

    it('importacao nunca restringe parcelas do termo: linha com parcela null (ou nao) = NF inteira, sem entrada em parcelasTermo', () => {
      const { componente, input } = telaImportacao(of({
        documentos: [nota(250976)],
        linhas: [linha(1, 'ENCONTRADO', { parcela: null }), linha(2, 'ENCONTRADO', { parcela: 2 })],
      }));
      const escolhidas: Map<string, number[]> = (componente as any).parcelasEscolhidas;
      escolhidas.set('NF-250976', [2]); // restricao antiga feita a mao
      componente.importarPlanilha(input);
      expect(componente.notasDoLote.map((n) => n.chave)).toEqual(['NF-250976']);
      expect(escolhidas.has('NF-250976')).toBeFalse();
    });

    describe('parcelas citadas pela planilha', () => {
      function importa(linhas: any[], modo: 'NOSSO_NUMERO' | 'NUMERO_NOTA' = 'NUMERO_NOTA', antes?: (c: any) => void) {
        sessionStorage.removeItem(CHAVE); // o lote guardado na aba voltaria no proximo componente
        const t = telaImportacao(of({ documentos: [nota(250976)], linhas }));
        t.componente.modoImportacao = modo;
        antes?.(t.componente as any);
        t.componente.importarPlanilha(t.input);
        return (t.componente as any).parcelasEscolhidas as Map<string, number[]>;
      }

      it('restringe o documento as parcelas citadas (uniao das linhas), nos dois modos', () => {
        for (const modo of ['NOSSO_NUMERO', 'NUMERO_NOTA'] as const) {
          const escolhidas = importa([linha(1, 'ENCONTRADO', { parcela: 3 }), linha(2, 'DIVERGENTE', { parcela: 1 })], modo);
          expect(escolhidas.get('NF-250976')).toEqual([1, 3]);
        }
      });

      it('parcela null em qualquer linha = documento inteiro (sem entrada)', () => {
        expect(importa([linha(1, 'ENCONTRADO', { parcela: null })]).has('NF-250976')).toBeFalse();
        expect(importa([linha(1, 'ENCONTRADO', { parcela: 2 }), linha(2, 'ENCONTRADO', { parcela: null })]).has('NF-250976')).toBeFalse();
      });

      it('linhas que nao entram (PAGA etc.) nao contam como parcela citada', () => {
        const escolhidas = importa([linha(1, 'ENCONTRADO', { parcela: 2 }), linha(2, 'PAGA', { parcela: 1 })]);
        expect(escolhidas.get('NF-250976')).toEqual([2]);
      });

      it('documento ja no lote: restricao manual soma; inteiro continua inteiro', () => {
        const soma = importa([linha(1, 'ENCONTRADO', { parcela: 3 })], 'NUMERO_NOTA', (c) => {
          c.selecao.set('NF-250976', nota(250976));
          c.parcelasEscolhidas.set('NF-250976', [2]);
        });
        expect(soma.get('NF-250976')).toEqual([2, 3]);
        const inteiro = importa([linha(1, 'ENCONTRADO', { parcela: 3 })], 'NUMERO_NOTA', (c) => c.selecao.set('NF-250976', nota(250976)));
        expect(inteiro.has('NF-250976')).toBeFalse();
      });
    });

    it('PAGA: rotulo, fica na tabela, nao entra no lote e conta como sem documento', () => {
      const { componente, toastr, input } = telaImportacao(of({
        documentos: [nota(250976)],
        linhas: [linha(1, 'ENCONTRADO'), linha(2, 'PAGA', { tipo: null, docEntry: null })],
      }));
      componente.importarPlanilha(input);
      expect(componente.situacaoImportacaoRotulo['PAGA']).toBe('Paga');
      expect(componente.linhasImportacao.map((l) => l.situacao)).toEqual(['PAGA']);
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('1 sem documento'), 'Planilha', jasmine.anything());
    });

    it('o "Baixar modelo" segue o modo escolhido', () => {
      const { componente } = telaImportacao(of({ documentos: [], linhas: [] }));
      expect(componente.modeloImportacao).toBe('assets/modelos/modelo-planilha-banco.xlsx');
      componente.modoImportacao = 'NUMERO_NOTA';
      expect(componente.modeloImportacao).toBe('assets/modelos/modelo-importacao-nota-nome.xlsx');
    });

    it('documento devolvido sem linha util nao apaga a restricao manual que ele tinha', () => {
      sessionStorage.removeItem(CHAVE);
      const t = telaImportacao(of({ documentos: [nota(250976)], linhas: [linha(1, 'NAO_ENCONTRADO', { tipo: null, docEntry: null })] }));
      const c = t.componente as any;
      c.selecao.set('NF-250976', nota(250976));
      c.parcelasEscolhidas.set('NF-250976', [2]);
      t.componente.importarPlanilha(t.input);
      expect(c.parcelasEscolhidas.get('NF-250976')).toEqual([2]);
    });

    it('ENCONTRADO com mensagem aparece na tabela (aviso); sem mensagem fica oculto', () => {
      const { componente, toastr, input } = telaImportacao(of({
        documentos: [nota(250976)],
        linhas: [linha(1, 'ENCONTRADO'), linha(2, 'ENCONTRADO', { mensagem: 'parcela nao definida' }), linha(3, 'ENCONTRADO', { mensagem: '  ' })],
      }));
      componente.importarPlanilha(input);
      expect(componente.linhasImportacao.map((l) => l.linha)).toEqual([2]);
      expect(toastr.warning).toHaveBeenCalledWith(jasmine.stringContaining('1 com aviso'), 'Planilha', jasmine.anything());
    });

    it('aceita .csv', () => {
      const { componente, input, chamadas } = telaImportacao(of({ documentos: [], linhas: [] }));
      input.files = [new File(['x'], 'titulos.csv')];
      componente.importarPlanilha(input);
      expect(chamadas.length).toBe(1);
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
  describe('botao de editar cessionaria (template)', () => {
    let criar: Subject<any>;
    let servico: any;
    function render() {
      criar = new Subject<any>();
      servico = {
        getDefinition: () => [], statusSefaz: () => of([]), statusBoleto: () => of([]), formasPagamento: () => of([]),
        listar: () => of(pagina([nota(1)])),
        cessionarias: jasmine.createSpy('cessionarias').and.returnValue(of([{ codigo: 'C1', nome: 'Um', nomePdf: 'Um S.A.' }])),
        criarCessionaria: () => criar,
      };
      TestBed.configureTestingModule({
        imports: [FormsModule],
        declarations: [NotaFiscalLoteComponent, SemAccessorStub, ModalComponent],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
          { provide: NotaFiscalLoteService, useValue: servico },
          { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['warning', 'success', 'error', 'info']) },
          { provide: AlertService, useValue: {} },
          { provide: AuthService, useValue: { getDecodeToken: () => ({ iss: 'https://sso', sub: 'Fulano' }) } },
          { provide: LogoService, useValue: { dataUri: () => Promise.resolve('') } },
          NotaFiscalLoteStorageService,
        ],
      });
      const fixture = TestBed.createComponent(NotaFiscalLoteComponent);
      fixture.detectChanges();
      fixture.componentInstance.baixarTermo = true;
      fixture.componentInstance.onTermoChange();
      fixture.detectChanges();
      return fixture;
    }
    const botao = (f: ComponentFixture<NotaFiscalLoteComponent>) => f.nativeElement.querySelector('#editarCessionaria') as HTMLButtonElement | null;

    it('so aparece com uma cessionaria selecionada e o clique abre o modal em modo edicao', async () => {
      const fixture = render();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(botao(fixture)).toBeNull();

      const modal = jasmine.createSpyObj('ModalComponent', ['openModal', 'closeModal']);
      fixture.componentInstance.modalCessionaria = modal;
      fixture.componentInstance.cessionaria = 'C1';
      fixture.detectChanges();
      botao(fixture)!.click();
      expect(modal.openModal).toHaveBeenCalled();
      expect(fixture.componentInstance.editandoCodigo).toBe('C1');
      expect(fixture.componentInstance.novaCessionaria.nomePdf).toBe('Um S.A.');

      fixture.componentInstance.cessionaria = '';
      fixture.detectChanges();
      expect(botao(fixture)).toBeNull();
    });

    it('com o POST pendente o modal real nao fecha (Escape, X); ao resolver, a nova e selecionada e a lista recarregada', fakeAsync(() => {
      const fixture = render();
      flushMicrotasks();
      const c = fixture.componentInstance;
      c.cessionaria = 'C1';
      c.escolherCessionaria(c.NOVA_CESSIONARIA, { control: { setValue: () => {} } } as any);
      c.novaCessionaria = { nome: 'Nova', nomePdf: 'Nova S.A.', cnpj: '12.345.678/0001-95' };
      fixture.detectChanges();
      tick(500);
      const aberto = () => document.querySelector('.modal.show');
      expect(aberto()).not.toBeNull();

      c.salvarCessionaria(); // POST pendente
      fixture.detectChanges();
      const x = document.querySelector('.modal.show .btn-close') as HTMLButtonElement;
      expect(x.disabled).toBeTrue();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      flushMicrotasks();
      tick(500);
      expect(aberto()).not.toBeNull();

      servico.cessionarias.calls.reset();
      servico.cessionarias.and.returnValue(of([{ codigo: 'C1', nome: 'Um' }, { codigo: 'C2', nome: 'Nova' }]));
      criar.next({ codigo: 'C2', nome: 'Nova' });
      fixture.detectChanges();
      tick(500);
      expect(c.cessionaria).toBe('C2');
      expect(servico.cessionarias).toHaveBeenCalledTimes(1);
      expect(aberto()).toBeNull();
    }));

    it('sair da tela com o POST pendente remove dialog, backdrop e modal-open do body', fakeAsync(() => {
      const fixture = render();
      flushMicrotasks();
      const c = fixture.componentInstance;
      c.escolherCessionaria(c.NOVA_CESSIONARIA, { control: { setValue: () => {} } } as any);
      c.novaCessionaria = { nome: 'Nova', nomePdf: 'Nova S.A.', cnpj: '12.345.678/0001-95' };
      fixture.detectChanges();
      tick(500);
      c.salvarCessionaria(); // POST pendente: o fechamento do usuario esta bloqueado
      fixture.detectChanges();
      expect(document.querySelector('.modal.show')).not.toBeNull();

      fixture.destroy(); // saida de rota
      tick(500);
      expect(document.querySelector('.modal')).toBeNull();
      expect(document.querySelector('.modal-backdrop')).toBeNull();
      expect(document.body.classList.contains('modal-open')).toBeFalse();
    }));

    it('sair da tela depois de fechar o modal nao fecha de novo: outro dialog mantem backdrop e modal-open', fakeAsync(() => {
      const fixture = render();
      flushMicrotasks();
      const c = fixture.componentInstance;
      c.escolherCessionaria(c.NOVA_CESSIONARIA, { control: { setValue: () => {} } } as any);
      fixture.detectChanges();
      tick(500);
      c.modalCessionaria.closeModal();
      tick(500);

      const outro = TestBed.inject(BsModalService).show('outro dialog');
      const hide = spyOn(outro, 'hide').and.callThrough();
      fixture.destroy(); // saida de rota: nao pode chamar hide() no ref ja fechado nem tocar o outro dialog
      tick(500);
      expect(document.querySelector('.modal.show')).not.toBeNull();
      expect(document.querySelector('.modal-backdrop')).not.toBeNull();
      expect(document.body.classList.contains('modal-open')).toBeTrue();
      expect(hide).not.toHaveBeenCalled();
      outro.hide();
      tick(500);
    }));

    // 360 ms = o ngx-bootstrap ja soltou o travamento do fechamento e o onHidden ainda nao veio. Abrir outro
    // dialog nessa janela ja e derrubado pelo proprio ngx-bootstrap (verificado sem destroy), entao o spec
    // confere direto que o destroy nao chama hide() de novo no ref que esta fechando.
    it('sair da tela entre a liberacao do travamento e o onHidden nao chama hide() de novo', fakeAsync(() => {
      const fixture = render();
      flushMicrotasks();
      const c = fixture.componentInstance;
      c.escolherCessionaria(c.NOVA_CESSIONARIA, { control: { setValue: () => {} } } as any);
      fixture.detectChanges();
      tick(500);
      const hide = spyOn(c.modalCessionaria.modalRef!, 'hide').and.callThrough();
      c.modalCessionaria.closeModal();
      tick(360);
      fixture.destroy();
      tick(500);
      expect(hide).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.modal')).toBeNull();
      expect(document.body.classList.contains('modal-open')).toBeFalse();
    }));
  });
});
