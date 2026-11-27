import { Actiable, Action, ActionReturn } from '../../../shared/components/action/action.model';

/** Registro da busca de cadastros do sap-reports; getActions dá ao app-modal-select o botão de seleção. */
export class CadastroRelatorio implements Actiable {
  codigo: string | number;
  nome: string;

  getActions(): Action[] {
    return [new Action('', new ActionReturn('selected', this), 'far fa-check-circle')];
  }
}
