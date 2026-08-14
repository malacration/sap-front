// model usado na tela
import { RouteLink } from './route-link';

export class PainelExpedicaoPedidos {
  DocEntry?: number;
  DocDate?: string;
  CardCode?: string;
  CardName?: string;
  SlpCode?: number;
  SlpName?: string;
  ItemCode?: string;
  Description?: string;
  DistribSum?: number;
  Quantity?: number;
  OnHand?: number;
  Name?: string;
  EstoqueMinimo?: number;
  EmOrdemDeCarregamento?: string;

  get orderRouterLink(): RouteLink | string {
    if (!this.DocEntry) return '';
    return new RouteLink(
      this.DocEntry.toString(),
      '/venda/pedidos-venda',
      { id: this.DocEntry }
    );
  }

  get cardCodeRouterLink(): RouteLink | string {
    if (!this.CardCode) return '';
    return new RouteLink(
      this.CardCode,
      '/clientes/parceiro-negocio/' + this.CardCode
    );
  }

  get cardNameRouterLink(): RouteLink | string {
    if (!this.CardCode) return this.CardName ?? '';
    return new RouteLink(
      this.CardName || this.CardCode,
      '/clientes/parceiro-negocio/' + this.CardCode
    );
  }


  get balanco(): number {
    return (this.OnHand ?? 0) - (this.Quantity ?? 0);
  }
}
