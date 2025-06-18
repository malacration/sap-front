import { formatCurrency } from "@angular/common";
import * as moment from "moment";
import { Action, ActionReturn } from "../../shared/components/action/action.model";
import { RouteLink } from "./route-link";
import { PedidoRetirada } from "./venda/pedido-retirada";
import { ItemRetirada } from "./venda/item-retirada";



export class OrdemCarregamento {
    DocEntry: number;
    U_nameOrdem: string;
    ORD_CRG_LINHACollection: LinhaItem[];  // Note a mudança no nome da propriedade
    CreateDate: string;
    U_Status: string;
    U_pesoTotal: number;


    // routerLinkPn() : RouteLink{
    //     return new RouteLink(this.U_cardName,"/clientes/parceiro-negocio/"+this.U_cardCode) 
    // }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-eye")
        ]
    }

    get dataCriacao() {
        return moment(this.CreateDate).format('DD/MM/YYYY'); 
    }
}

export class LinhaItem {
    U_cardName: string;  // Note o U_ maiúsculo
    DocEntry: number;
    U_orderDocEntry: number;
    U_cardCode: string;
    U_docNumPedido: number;
    LineId: number;
    VisOrder: number;
    U_quantidade: number;
    U_pesoItem?: number; 
    U_itemCode : string;
    U_description : string;
}