import { CobrancaTitulo } from './cobranca-titulo';

describe('CobrancaTitulo', () => {

  function titulo(dados: Partial<CobrancaTitulo>): CobrancaTitulo {
    return CobrancaTitulo.from(dados);
  }

  describe('identificacao', () => {
    it('usa a serie da nota quando ela existe, nao o DocEntry interno', () => {
      // Serial e o numero que o usuario ve na tela e no documento; DocEntry e chave interna.
      const nf = titulo({ Tipo: 'NF', Serial: '1385', DocNum: 999, InstlmntID: 1 });

      expect(nf.identificacao).toBe('NF 1385 parcela 1');
    });

    it('cai no DocNum quando a nota nao tem serie', () => {
      const nf = titulo({ Tipo: 'NF', Serial: null, DocNum: 2236, InstlmntID: 2 });

      expect(nf.identificacao).toBe('NF 2236 parcela 2');
    });

    it('adiantamento nao e rotulado como NF', () => {
      const adiantamento = titulo({ Tipo: 'AD', Serial: null, DocNum: 252, InstlmntID: 1 });

      expect(adiantamento.identificacao).toBe('Adiantamento 252 parcela 1');
    });

    it('distingue duas parcelas do mesmo documento', () => {
      // E o caso que motivou isso: o titulo do modal so tinha o nome do cliente, entao duas
      // linhas do mesmo cliente ficavam identicas na tela.
      const primeira = titulo({ Tipo: 'NF', Serial: '1385', InstlmntID: 1 });
      const segunda = titulo({ Tipo: 'NF', Serial: '1385', InstlmntID: 2 });

      expect(primeira.identificacao).not.toBe(segunda.identificacao);
    });
  });

  describe('telefoneFormatado', () => {
    it('formata celular de 11 digitos', () => {
      expect(titulo({ Telefone: '66999998888' }).telefoneFormatado).toBe('(66) 99999-8888');
    });

    it('formata fixo de 10 digitos', () => {
      expect(titulo({ Telefone: '6634211234' }).telefoneFormatado).toBe('(66) 3421-1234');
    });

    it('mostra o valor cru quando nao tem a quantidade de digitos esperada', () => {
      // OCRD tem telefone incompleto ("69") e com texto - melhor exibir do que esconder.
      expect(titulo({ Telefone: '69' }).telefoneFormatado).toBe('69');
    });

    it('mostra travessao quando o cliente nao tem telefone', () => {
      expect(titulo({ Telefone: null }).telefoneFormatado).toBe('—');
      expect(titulo({ Telefone: '   ' }).telefoneFormatado).toBe('—');
    });

    it('nao estoura se o SAP mandar o telefone como numero', () => {
      // `from` e Object.assign de JSON cru: o tipo string e ficcao de compilacao. Um .replace
      // num number lancava TypeError dentro do getter e derrubava a tabela inteira.
      const comNumero = CobrancaTitulo.from({ Telefone: 6699998888 as any });

      expect(() => comNumero.telefoneFormatado).not.toThrow();
      expect(comNumero.telefoneFormatado).toBe('(66) 9999-8888');
    });
  });

  describe('valorPagoCurrency', () => {
    it('formata o valor do ultimo recebimento aplicado a parcela', () => {
      // formatCurrency usa espaço fixo ( ) entre o simbolo e o valor, nao espaço normal.
      expect(titulo({ ValorPago: 1234.5 }).valorPagoCurrency).toBe('R$ 1.234,50');
    });

    it('mostra travessao quando o titulo nunca recebeu pagamento (nao confunde com R$ 0,00)', () => {
      expect(titulo({ ValorPago: null }).valorPagoCurrency).toBe('—');
    });

    it('nao confunde recebimento de R$ 0,00 real com titulo nunca recebido', () => {
      expect(titulo({ ValorPago: 0 }).valorPagoCurrency).toBe('R$ 0,00');
    });
  });

  describe('dataPagamentoFormatada', () => {
    it('formata a data do ultimo recebimento', () => {
      expect(titulo({ DataPagamento: '20260810' }).dataPagamentoFormatada).toBe('10/08/2026');
    });

    it('fica em branco quando o titulo nunca recebeu pagamento', () => {
      expect(titulo({ DataPagamento: null }).dataPagamentoFormatada).toBe('');
    });
  });

  describe('situacaoSapLabel', () => {
    it('mostra Pago quando o SAP fechou a parcela', () => {
      expect(titulo({ SituacaoSap: 'PAGO' }).situacaoSapLabel).toBe('Pago');
    });

    it('mostra Pago Parcial quando a parcela recebeu algo mas continua aberta no SAP', () => {
      expect(titulo({ SituacaoSap: 'PAGO_PARCIAL' }).situacaoSapLabel).toBe('Pago Parcial');
    });

    it('mostra Aberto quando a parcela nunca recebeu nada', () => {
      expect(titulo({ SituacaoSap: 'ABERTO' }).situacaoSapLabel).toBe('Aberto');
    });
  });

  describe('observacaoPagamentoFormatada', () => {
    it('mostra a observacao do recebimento quando existe', () => {
      expect(titulo({ ObservacaoPagamento: 'cheque pre-datado' }).observacaoPagamentoFormatada).toBe('cheque pre-datado');
    });

    it('mostra travessao quando o recebimento nao tem observacao', () => {
      expect(titulo({ ObservacaoPagamento: null }).observacaoPagamentoFormatada).toBe('—');
    });
  });
});
