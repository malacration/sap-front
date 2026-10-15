export class LastPrice{
    ItemCode : string
    LastPurPrc : number
    LstEvlPric : number
    AvgPrice : number
    U_productionCost : number
    InvntryUom? : string
    UgpCode? : string
    UgpName? : string
    PrecoUltimaNfUnEstoque : number
    FreteUltimaNf : number
    FreteUnEstoque? : number
    CustoComFreteUnEstoque : number
    UltimaNf? : UltimaNfEntrada
    QtdCtesUltimaNf? : number
}

export class UltimaNfEntrada{
    DocEntry : number
    DocNum? : number
    DocDate? : string
    ItemCode : string
    UnidadeCompra? : string
    Quantidade? : number
    LineTotal : number
    InvQty : number
}
