import { Action, ActionReturn } from "../../../shared/components/action/action.model";

export class ItemRetirada{ 
    itemCode: string; 
    quantidade: number
    descricao : string
    precoNegociado : number
    LineId : number

    constructor(itemCode, quantidade, descricao, LineId : number, precoNegociado = undefined){
        this.itemCode = itemCode
        this.quantidade = quantidade
        this.descricao = descricao
        this.LineId = LineId
        this.precoNegociado = precoNegociado
    }
}