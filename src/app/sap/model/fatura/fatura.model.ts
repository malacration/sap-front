import { Column } from "../../../shared/components/table/table.component"


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
    



export class FaturaDefinition{
    
    getFaturaDefinition() {
        return [
            new Column('Código', 'id'),
            new Column('Data', 'data'),
            new Column('Parcelas', 'parcelas', '<span class="badge badge-pill badge-primary">${value}</span>'),
            new Column('Valor R$:', 'valor'),
            new Column('Vencimento Proxima Parcela', 'vencimentoProximaParcela'),
            new Column('Vencimento ultima parcela', 'vencimentoUltimaParcela'),
        ]   
    }
}