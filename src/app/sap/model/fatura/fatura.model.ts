

export class Fatura{
    
    id : string
    data : string
    valor : number
    parcelas : number
    vencimentoUltimaParcela : string
    vencimentoProximaParcela : string
 
    
    constructor(
        id : string,
        data : string, 
        valor : number, 
        parcelas : number, 
        vencimentoUltimaParcela : string, 
        vencimentoProximaParcela : string){
            this.id = id
            this.data = data
            this.valor = valor
            this.parcelas = parcelas
            this.vencimentoUltimaParcela = vencimentoUltimaParcela
            this.vencimentoProximaParcela = vencimentoProximaParcela
    }
}