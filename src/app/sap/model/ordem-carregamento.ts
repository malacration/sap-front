import { formatCurrency } from "@angular/common";
import * as moment from "moment";
import { Action, ActionReturn } from "../../shared/components/action/action.model";
import { RouteLink } from "./route-link";
import { PedidoRetirada } from "./venda/pedido-retirada";
import { ItemRetirada } from "./venda/item-retirada";



export class OrdemCarregamento {
    DocEntry: number;
    U_nameOrdem: string;
    Ord_CRG_LINHACollection: LinhaItem[];
    U_dataCriacao: string;


    // routerLinkPn() : RouteLink{
    //     return new RouteLink(this.U_cardName,"/clientes/parceiro-negocio/"+this.U_cardCode) 
    // }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-check-circle")
        ]
    }

    get dataCriacao() {
        return moment(this.U_dataCriacao).format('DD/MM/YYYY'); 
    }
}

export class LinhaItem {
    u_cardName: string;
    docEntry: number;
    u_orderDocEntry: number;
    u_cardCode: string;
    u_docNumPedido: number;
    LineId: number;
    VisOrder: number;
}