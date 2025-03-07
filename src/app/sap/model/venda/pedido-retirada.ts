import { Action, ActionReturn } from "../../../shared/components/action/action.model"
import { ItemRetirada } from "./item-retirada"

export class PedidoRetirada{
    docEntryVendaFutura : number
    itensRetirada : Array<ItemRetirada>
    dataEntrega : Date
    

    constructor(
        docEntryVendaFutura : number, 
        itensRetirada : Array<ItemRetirada>,
        dataEntrega : Date){
        this.dataEntrega = dataEntrega
        this.docEntryVendaFutura = docEntryVendaFutura
        this.itensRetirada = itensRetirada
    }
}