// model usado na tela
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


  get balanco(): number {
    return (this.OnHand ?? 0) - (this.Quantity ?? 0);
  }
}
