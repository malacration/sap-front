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
    U_pesoTotal2 : number;
    U_filial3 : string;
    OpeningRemarks
    VehicleState
    Incoterms
    Carrier : string
    U_numeroAnexo : number


    // routerLinkPn() : RouteLink{
    //     return new RouteLink(this.U_cardName,"/clientes/parceiro-negocio/"+this.U_cardCode) 
    // }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-eye")
        ]
    }

    get dataCriacao() {
        return moment.utc(this.CreateDate).format('DD/MM/YYYY');
    }
}

export class LinhaItem {
    U_cardName: string;
    DocEntry: number;
    U_orderDocEntry: number;
    U_cardCode: string;
    U_numDocPedido: number;
    LineId: number;
    VisOrder: number;
    U_quantidade: number;
    U_pesoItem2?: number;
    U_itemCode: string;
    U_description: string;
    U_precoNegociado: number;
    U_precoBase: number;
    U_comentario: string;
    U_fretePorLinha: number;

    // Campos novos
    U_precoUnitario : number;
    U_codigoDeposito : string;
    U_usage : number;
    U_taxCode : string
    U_costingCode : string
    U_costingCode2 : string
    U_baseType : number
    U_baseEntry : number
    U_baseLine : number

    U_unMedida : string
    U_qtdEmEstoque : number

    U_batchNumbers?: { BatchNumber: string; Quantity: number; ItemCode: string }[];
}