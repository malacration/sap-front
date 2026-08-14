import { RouteLink } from './route-link';

export class VendaMensal {
  Ano: number;
  Mes: number;
  Total: number;
  Qtde: number;
}

export class VendaDetalhe {
  DocEntry: number;
  DocNum: number;
  CardCode?: string;
  CardName?: string;
  DocDate?: string;
  DocTotal: number;

  get cardNameRouterLink(): RouteLink | string {
    if (!this.CardCode) return this.CardName ?? '';
    return new RouteLink(
      this.CardName || this.CardCode,
      '/clientes/parceiro-negocio/' + this.CardCode
    );
  }
}

export class VendaProduto {
  ItemCode?: string;
  Description?: string;
  Quantidade: number;
  Total: number;
}
