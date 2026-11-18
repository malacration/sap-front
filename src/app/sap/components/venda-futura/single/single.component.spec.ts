import { VendaFuturaSingleComponent } from './single.component';
import { BoletoVf } from '../../../service/DownPaymentService';

/**
 * Status do boleto na aba do contrato. Casos reais do HOMOLOG: 172 (pago e devolvido),
 * 391 (devolucao cancelada = aberto), 138 boleto 5532 (adiantamento de reconhecimento de
 * devolucao, fechado por reconciliacao sem recebimento) e 415 (pagamento parcial = aberto).
 */
describe('VendaFuturaSingleComponent - status do boleto', () => {
  // Os metodos nao usam estado do componente: sem DI.
  const c = Object.create(VendaFuturaSingleComponent.prototype) as VendaFuturaSingleComponent;
  const boleto = (b: Partial<BoletoVf>) => b as BoletoVf;

  it('devolvido vence qualquer outro status', () => {
    const b = boleto({ DocStatus: 'C', Devolucao: '302859', Recebimento: '1' });
    expect(c.statusBoletoLabel(b)).toBe('Cancelado (devolvido)');
    expect(c.statusBoletoClass(b)).toBe('badge-danger');
  });

  it('aberto, mesmo com recebimento parcial', () => {
    const b = boleto({ DocStatus: 'O', Recebimento: '89294' });
    expect(c.statusBoletoLabel(b)).toBe('Aberto');
    expect(c.statusBoletoClass(b)).toBe('badge-warning');
  });

  it('fechado com recebimento e pago', () => {
    const b = boleto({ DocStatus: 'C', Recebimento: '80063' });
    expect(c.statusBoletoLabel(b)).toBe('Pago');
    expect(c.statusBoletoClass(b)).toBe('badge-success');
  });

  it('fechado sem recebimento nem devolucao nao e pago', () => {
    const b = boleto({ DocStatus: 'C' });
    expect(c.statusBoletoLabel(b)).toBe('Fechado');
    expect(c.statusBoletoClass(b)).toBe('badge-secondary');
  });
});
