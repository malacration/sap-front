import * as moment from "moment"
import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { Column } from "../../../shared/components/table/column.model"
import { formatCurrency } from "@angular/common"


export class Parcela implements Actiable {
    
    id : string
    data : string
    valor : number
    vencimento : string
    private _pago : boolean = false
    carregando = false;
    isBoleto = true

    get vencimentoF(){
        return moment(moment(this.vencimento)).locale("pt-br").format('L');
    }

    get valorCurrency(){
        return formatCurrency(this.valor,'pt','R$')
    }

    set pago(pago : boolean){
        this._pago = pago;
        this.getActions(true)
    }

    private _actions : Array<Action>

    getActions(force = false) : Array<Action> {
        if(this._actions && !force)
            return this._actions;
        let pago = new Action("Pago", new ActionReturn("ver-parcela",this),"")
        pago.color = "success"
        if(this._pago){
            this._actions = [
                pago
            ]
        }
        else if(this.isBoleto)
            this._actions = [
                new Action("Boleto", new ActionReturn("ver-boleto",this), "fa-solid fa-barcodeima"),
                // new Action("Pix", new ActionReturn("ver-pix",this), "fa-brands fa-pix")
            ];
        return this._actions;
    }
}

export class ParcelaDefinition{

    getFaturaDefinition() {
        return [
            new Column('N', 'id'),
            new Column('Vencimento', 'vencimentoF'),
            new Column('Valor', 'valorCurrency')
        ]   
    }

}