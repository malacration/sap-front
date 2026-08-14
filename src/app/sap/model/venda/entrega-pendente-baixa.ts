import { formatCurrency } from "@angular/common";
import { Action, ActionReturn } from "../../../shared/components/action/action.model";

export class EntregaPendenteBaixa {
  DocEntry: number;
  DocNum: number;
  ValorNota: number;
  ValorAplicavel: number;
  Diferenca: number;
  TemAdiantamento: boolean;

  get valorNotaCurrency() {
    return formatCurrency(this.ValorNota, 'pt', 'R$');
  }

  get valorAplicavelCurrency() {
    return formatCurrency(this.ValorAplicavel, 'pt', 'R$');
  }

  get diferencaCurrency() {
    return formatCurrency(this.Diferenca, 'pt', 'R$');
  }

  getActions(): Action[] {
    if (!this.TemAdiantamento)
      return [];
    return [
      new Action("Baixar c/ Spread", new ActionReturn("baixarSpread", this), "fa-solid fa-coins", "warning"),
    ];
  }
}
