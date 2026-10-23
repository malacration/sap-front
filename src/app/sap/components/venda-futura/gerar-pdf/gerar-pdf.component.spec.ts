import { Subject, of, throwError } from 'rxjs';
import { SimpleChange } from '@angular/core';
import { GerarPdfComponent } from './gerar-pdf.component';

/** Minuta do contrato: forma e parcelamento vem do pedido de origem via /contrato-venda-futura/{id}/negociacao. */
describe('GerarPdfComponent - dados da negociacao', () => {

  let pedidos: Array<number>;
  let resposta: (docEntry: number) => any;
  let component: GerarPdfComponent;
  let baixados: Array<string>;
  let erros: Array<string>;
  let paginaUnica: Array<boolean>;
  let confirmacoes: Array<string>;
  let confirma: boolean;
  let clientes: Array<string>;
  let respostaCliente: () => any;

  beforeEach(() => {
    pedidos = [];
    resposta = () => of(null);
    baixados = [];
    paginaUnica = [];
    const pdfService = { baixarPdfPaginado: (elemento, nome, umaPagina) => { baixados.push(nome); paginaUnica.push(umaPagina); return Promise.resolve(); } } as any;
    erros = [];
    confirmacoes = [];
    confirma = true;
    const alert = {
      error: (msg) => { erros.push(msg); return Promise.resolve(); },
      confirm: (msg) => { confirmacoes.push(msg); return Promise.resolve({ isConfirmed: confirma }); },
    } as any;
    clientes = [];
    respostaCliente = () => of(null);
    const bpService = { get: (cardCode) => { clientes.push(cardCode); return respostaCliente(); } } as any;
    component = new GerarPdfComponent({ negociacao: (docEntry) => { pedidos.push(docEntry); return resposta(docEntry); } } as any, pdfService, alert, bpService);
  });

  function abre(docEntry: number) {
    component.vendaFutura = { DocEntry: docEntry } as any;
    component.ngOnChanges({ vendaFutura: new SimpleChange(null, component.vendaFutura, false) });
  }

  it('busca a negociacao do contrato aberto', () => {
    resposta = () => of({ formaPagamento: 'BOLETO', quantidadeParcelas: 3, condicaoPagamento: '30/60/90' });

    abre(7);

    expect(pedidos).toEqual([7]);
    expect(component.formaPagamentoTexto).toBe('BOLETO');
    expect(component.parcelamentoTexto).toBe('3 parcelas (30/60/90)');
  });

  it('a vista mostra 1 parcela', () => {
    resposta = () => of({ formaPagamento: 'DEPOSITO', quantidadeParcelas: 1, condicaoPagamento: 'À vista' });

    abre(7);

    expect(component.parcelamentoTexto).toBe('1 parcela (À vista)');
  });

  it('sem dados mostra "Não informada/o" em vez de vazio', () => {
    resposta = () => of({ formaPagamento: null, quantidadeParcelas: null, condicaoPagamento: null });

    abre(7);

    expect(component.formaPagamentoTexto).toBe('Não informada');
    expect(component.parcelamentoTexto).toBe('Não informado');
  });

  it('erro na busca nao trava a minuta', () => {
    resposta = () => throwError(() => new Error('403'));

    abre(7);

    expect(component.erroNegociacao).toBeTrue();
    expect(component.carregandoNegociacao).toBeFalse();
    //falha sai como linha em branco, para nao parecer que o pedido nao tem o dado
    expect(component.formaPagamentoTexto).toBe(GerarPdfComponent.BRANCO);
    expect(component.parcelamentoTexto).toBe(GerarPdfComponent.BRANCO);
  });

  it('resposta atrasada de outro contrato e descartada', () => {
    const respostas = { 1: new Subject<any>(), 2: new Subject<any>() };
    resposta = (docEntry) => respostas[docEntry].asObservable();

    abre(1);
    abre(2);
    respostas[1].next({ formaPagamento: 'DO CONTRATO 1', quantidadeParcelas: 9 });

    expect(component.negociacao).toBeNull();
    expect(component.formaPagamentoTexto).toBe('carregando...');

    respostas[2].next({ formaPagamento: 'BOLETO', quantidadeParcelas: 2 });
    expect(component.formaPagamentoTexto).toBe('BOLETO');
  });

  it('sem contrato nao consulta', () => {
    component.ngOnChanges({ vendaFutura: new SimpleChange(null, undefined, true) });
    expect(pedidos).toEqual([]);
  });

  describe('download', () => {

    it('baixa com o numero do contrato e o nome do cliente', async () => {
      abre(1234);
      component.vendaFutura.U_cardName = 'JOAO DA SILVA';
      component.pdfContent = { nativeElement: document.createElement('div') } as any;

      await component.baixarPdf();

      expect(baixados).toEqual(['Minuta de contrato 1234 - JOAO DA SILVA.pdf']);
      expect(paginaUnica).toEqual([true]);
      expect(component.gerandoPdf).toBeFalse();
    });

    it('tira do nome os caracteres que o sistema de arquivos recusa', () => {
      abre(7);
      component.vendaFutura.U_cardName = 'AGRO S/A: FAZENDA "BOA" <VISTA>';

      expect(component.nomeArquivo).toBe('Minuta de contrato 7 - AGRO S A FAZENDA BOA VISTA.pdf');
    });

    it('clique duplo nao gera dois arquivos', async () => {
      abre(7);
      component.vendaFutura.U_cardName = 'X';
      component.pdfContent = { nativeElement: document.createElement('div') } as any;

      await Promise.all([component.baixarPdf(), component.baixarPdf()]);

      expect(baixados.length).toBe(1);
    });
  });

  describe('falhas aparecem na tela', () => {

    it('erro ao gerar mostra alerta e libera o botao', async () => {
      component = new GerarPdfComponent({ negociacao: () => of(null) } as any,
        { baixarPdfPaginado: () => Promise.reject(new Error('canvas quebrou')) } as any,
        { error: (msg) => { erros.push(msg); return Promise.resolve(); } } as any, { get: () => of(null) } as any);
      component.vendaFutura = { DocEntry: 1, U_cardName: 'X' } as any;
      component.pdfContent = { nativeElement: document.createElement('div') } as any;

      await component.baixarPdf();

      expect(erros).toEqual(['Não foi possível gerar o PDF: canvas quebrou']);
      expect(component.gerandoPdf).toBeFalse();
    });

    it('sem a minuta montada avisa em vez de nao fazer nada', async () => {
      component.pdfContent = undefined;

      await component.baixarPdf();

      expect(erros.length).toBe(1);
      expect(baixados).toEqual([]);
    });
  });

  describe('dados do cliente na minuta', () => {

    function abreContrato(localidade: number = null) {
      component.vendaFutura = { DocEntry: 1, U_cardCode: 'CLI0001', U_Localidade: localidade } as any;
      component.ngOnChanges({ vendaFutura: new SimpleChange(null, component.vendaFutura, false) });
    }

    const entrega = (rua: string, localidade: number) => ({ AddressType: 'bo_ShipTo', TypeOfAddress: 'RUA', Street: rua,
      StreetNo: '10', Block: 'CENTRO', City: 'PORTO VELHO', State: 'RO', U_Localidade: localidade });

    it('busca o cliente do contrato e preenche endereco de entrega e documento', () => {
      respostaCliente = () => of({ BPFiscalTaxIDCollection: [{ TaxId4: '039.989.282-60' }],
        BPAddresses: [{ AddressType: 'bo_BillTo', Street: 'COBRANCA' }, entrega('FLORIANO PEIXOTO', 5)] });

      abreContrato();

      expect(clientes).toEqual(['CLI0001']);
      expect(component.documentoCliente).toBe('039.989.282-60');
      expect(component.logradouroEntrega).toBe('RUA FLORIANO PEIXOTO');
      expect(component.enderecoEntrega.StreetNo).toBe('10');
      expect(component.cidadeEntrega).toBe('PORTO VELHO/RO');
    });

    it('com mais de uma entrega usa a da localidade do contrato', () => {
      respostaCliente = () => of({ BPAddresses: [entrega('PRIMEIRA', 5), entrega('DA LOCALIDADE', 9)] });

      abreContrato(9);

      expect(component.logradouroEntrega).toBe('RUA DA LOCALIDADE');
    });

    it('CNPJ no topo do cadastro tambem vale', () => {
      respostaCliente = () => of({ TaxId0: '12.345.678/0001-99', BPAddresses: [] });

      abreContrato();

      expect(component.documentoCliente).toBe('12.345.678/0001-99');
      expect(component.enderecoEntrega).toBeNull();
      expect(component.logradouroEntrega).toBe('');
    });

    it('falha ao buscar o cliente deixa os campos em branco, sem erro', () => {
      respostaCliente = () => throwError(() => new Error('404'));

      abreContrato();

      expect(component.documentoCliente).toBe('');
      expect(component.cidadeEntrega).toBe('');
    });
  });

  describe('achados do review da minuta', () => {

    function contrato(docEntry: number, cardCode: string) {
      component.vendaFutura = { DocEntry: docEntry, U_cardCode: cardCode, U_cardName: 'X' } as any;
      component.ngOnChanges({ vendaFutura: new SimpleChange(null, component.vendaFutura, false) });
      component.pdfContent = { nativeElement: document.createElement('div') } as any;
    }

    it('trocar de contrato limpa o cliente anterior, mesmo se o novo nao chegar', () => {
      respostaCliente = () => of({ TaxId4: '111.111.111-11', BPAddresses: [] });
      contrato(1, 'CLI1');
      expect(component.documentoCliente).toBe('111.111.111-11');

      respostaCliente = () => throwError(() => new Error('404'));
      contrato(2, 'CLI2');

      expect(component.documentoCliente).toBe('');
      expect(component.carregandoCliente).toBeFalse();
    });

    it('nao baixa enquanto carrega negociacao ou cliente', async () => {
      resposta = () => new Subject<any>().asObservable();
      contrato(1, 'CLI1');
      expect(component.carregandoDados).toBeTrue();

      await component.baixarPdf();

      expect(baixados).toEqual([]);
      expect(erros).toEqual(['Aguarde carregar os dados do contrato antes de baixar a minuta.']);
    });

    it('com falha na negociacao pergunta antes e so baixa se confirmar', async () => {
      resposta = () => throwError(() => new Error('500'));
      contrato(1, 'CLI1');

      confirma = false;
      await component.baixarPdf();
      expect(confirmacoes).toEqual([GerarPdfComponent.AVISO_SEM_NEGOCIACAO]);
      expect(baixados).toEqual([]);

      confirma = true;
      await component.baixarPdf();
      expect(baixados.length).toBe(1);
    });

    it('trocar de contrato com a confirmacao aberta nao baixa', async () => {
      resposta = () => throwError(() => new Error('500'));
      contrato(1, 'CLI1');
      let responde: (r: any) => void;
      (component as any).alert.confirm = () => new Promise(r => responde = r);

      const download = component.baixarPdf();
      resposta = () => new Subject<any>().asObservable();
      contrato(2, 'CLI2');
      responde({ isConfirmed: true });
      await download;

      expect(baixados).toEqual([]);
    });
  });
});
