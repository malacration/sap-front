import { formatCurrency } from '@angular/common';

/**
 * Total do filtro inteiro da tela de títulos (não só da página carregada). Vem do
 * `GET /cobranca/titulos/totais`, que roda o mesmo pipeline do `listar` no backend.
 */
export class CobrancaTitulosTotal {
  Parcelas = 0;
  Saldo = 0;
  ValorPago = 0;
  ParcelasComPagamento = 0;
  /** A varredura parou no teto de páginas do SAP: o total é parcial e a tela precisa avisar. */
  Truncado = false;

  static from(json: any): CobrancaTitulosTotal {
    return Object.assign(new CobrancaTitulosTotal(), json);
  }

  get saldoCurrency(): string {
    return formatCurrency(this.Saldo ?? 0, 'pt', 'R$');
  }

  get valorPagoCurrency(): string {
    return formatCurrency(this.ValorPago ?? 0, 'pt', 'R$');
  }
}
