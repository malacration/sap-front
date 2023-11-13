import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { Column } from "../../../shared/components/table/column.model"


export class Parcela implements Actiable {
    
    id : string
    data : string
    valor : number
    vencimento : string

    getActions() : Array<Action>{
        return [
            new Action("Boleto", new ActionReturn("ver-boleto",this), "fa-solid fa-barcode"),
            new Action("Pix", new ActionReturn("ver-pix",this), "fa-brands fa-pix")
        ]
    }
    
    constructor(
        id : string,
        data : string, 
        valor : number, 
        vencimento : string){
            this.id = id
            this.data = data
            this.valor = valor
            this.vencimento = vencimento
    }
}
    

export class ParcelaDefinition{

    getFaturaDefinition() {
        return [
            new Column('Código', 'id'),
            new Column('Data', 'data'),
            new Column('Valor R$:', 'valor'),
            new Column('Vencimento', 'vencimento'),
        ]   
    }
}