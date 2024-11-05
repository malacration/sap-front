export class ItemRetirada{ 
    itemCode: string; 
    quantidade: number
    descricao : string
    precoNegociado : number

    constructor(itemCode, quantidade, descricao, precoNegociado = undefined){
        this.itemCode = itemCode
        this.quantidade = quantidade
        this.descricao = descricao
        this.precoNegociado = precoNegociado
    }
}