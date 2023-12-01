import * as moment from "moment"
import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { Column } from "../../../shared/components/table/column.model"
import { formatCurrency } from "@angular/common"


export class Parcela implements Actiable {
    
    id : string
    data : string
    valor : number
    vencimento : string

    get vencimentoF(){
        return moment(this.vencimento).format('L');
    }

    get valorCurrency(){
        return formatCurrency(this.valor,'pt','R$')
    }

    getActions() : Array<Action>{
        return [
            new Action("Boleto", new ActionReturn("ver-boleto",this), "fa-solid fa-barcodeima"),
            new Action("Pix", new ActionReturn("ver-pix",this), "fa-brands fa-pix")
        ]
    }
}
    

export class ParcelaDefinition{

    getFaturaDefinition() {
        return [
            new Column('Código', 'id'),
            new Column('Vencimento', 'vencimentoF'),
            new Column('Valor R$:', 'valorCurrency')
        ]   
    }

}