import { PrazoPagamento } from "./prazo-pagamento";
import { Produto } from "./produto";

export class Analise{
    descricao : string
    custoSap : boolean
    produtos : Array<Produto> = new Array()
    
    prazos: Array<PrazoPagamento> = [ 
        { descricao: 'VISTA ou 15 dias', fator: -0.08 }, 
        { descricao: '30 dias', fator: -0.06 }, 
        { descricao: '30/60/90 ou 60 dias', fator: -0.04 }, 
        { descricao: '30/60/90/120 ou 75 dias', fator: -0.03 }, 
        { descricao: '30/60/90/120/150 ou 90 dias', fator: -0.02 }, 
        { descricao: '120 dias', fator: 0 }, 
        { descricao: '150 dias', fator: 0.025 }, 
    ];

    constructor(descicao){
        this.descricao = descicao
    }
}