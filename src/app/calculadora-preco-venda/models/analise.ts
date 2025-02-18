import { Produto } from "./produto";

export class Analise{
    descricao : string
    custoSap : boolean
    produtos : Array<Produto> = new Array()
    
    constructor(descicao){
        this.descricao = descicao
    }
}