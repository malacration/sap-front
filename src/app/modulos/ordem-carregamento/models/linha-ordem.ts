import { RouteLink } from '../../../sap/model/route-link';
import { isFaturaReserva } from './fatura-reserva';

// Linha da aba Produtos da ordem (pedido ou retirada de fatura de reserva), como vem de findLoadOrders.
export class LinhaOrdem {
  [campo: string]: any;

  orderRouterLink(): RouteLink {
    return isFaturaReserva(this)
      ? new RouteLink(this.DocNum, '/financeiro/notas-fiscais', { id: this.DocEntry })
      : new RouteLink(this.DocNum, '/venda/pedidos-venda', { id: this.DocEntry });
  }

  routerLink(): RouteLink {
    return new RouteLink(this.CardCode, '/clientes/parceiro-negocio/' + this.CardCode);
  }

  get tipo(): string {
    return isFaturaReserva(this)
      ? '<span class="badge badge-info">NF venda futura</span>'
      : '<span class="badge badge-warning">Pedido</span>';
  }

  get pesoFormatado(): string {
    return Number(this.Weight1 || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get freteFormatado(): string {
    return Number(this.DistribSum || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
