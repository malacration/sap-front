import * as moment from "moment";
import { Action, ActionReturn } from "../../shared/components/action/action.model";

export class OrdemCarregamento {
    DocEntry: number;
    U_nameOrdem: string;
    U_Status: string
    U_filial3: string
    CreateDate: string;
    Weight1: string;

    get dataCriacao() {
        return moment.utc(this.CreateDate).format('DD/MM/YYYY');
    }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-eye")
        ]
    }
}