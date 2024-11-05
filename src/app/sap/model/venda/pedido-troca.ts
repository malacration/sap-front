
import { LinhasPedido } from "../../components/document/documento.statement.component"
import { Item } from "../item"
import { ItemRetirada } from "./item-retirada"



export class PedidoTroca{
    docEntry : number
    itemSaida : Array<ItemRetirada> 
    itemRecebido : Array<LinhasPedido>
    
    constructor(
        docEntry : number, 
        itemSaida : Array<ItemRetirada>,
        itemRecebido : Array<LinhasPedido>){
        this.docEntry = docEntry
        this.itemSaida = itemSaida
        this.itemRecebido = itemRecebido
    }
}


export class ItemTroca{
    id : string
    quantidade : number
}