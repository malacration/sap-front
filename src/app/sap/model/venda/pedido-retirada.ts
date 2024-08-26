
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


export class ItemRetirada{ 
    itemCode: string; 
    quantity: number
    descricao : string

    constructor(itemCode, quantity, descricao){
        this.itemCode = itemCode
        this.quantity = quantity
        this.descricao = descricao
    }
}