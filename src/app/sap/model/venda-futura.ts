import { formatCurrency } from "@angular/common";
import * as moment from "moment";
import { Action, ActionReturn } from "../../shared/components/action/action.model";



export class VendaFutura {
    U_orderDocEntry: number;
    U_cardCode: string;
    AR_CF_LINHACollection: LinhaItem[];
    U_vendedor: number;
    U_cardName: string;
    U_valorFrete: number;
    DocEntry: number;
    U_dataCriacao: string;

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-check-circle")
        ]
    }

    get dataCriacao() {
        return moment(this.U_dataCriacao).format('DD/MM/YYYY'); 
    }

    get totalCurrency() {
        return formatCurrency(this.U_valorFrete + this.totalProdutos, 'pt', 'R$');
    }

    get frete() {
        return formatCurrency(this.U_valorFrete, 'pt', 'R$');
    }

    get produtosCurrency() {
        return formatCurrency(this.totalProdutos, 'pt', 'R$');
    }

    get totalProdutos() {
        return this.AR_CF_LINHACollection.reduce((acc, it) => acc + it.total, 0);
    }
}

export class LinhaItem {
    U_itemCode: string;
    U_description: string;
    U_precoNegociado: number;
    U_quantity: number;
    U_precoBase: number;
    U_desconto: number;
    U_comissao: number;
    U_MeasureUnit: string;
    LineId: number;
    VisOrder: number;

    get total() {
        return this.U_precoNegociado * this.U_quantity;
    }
}
