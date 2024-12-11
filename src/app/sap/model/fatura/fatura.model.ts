import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { Column } from "../../../shared/components/table/column.model"
import { formatCurrency } from "@angular/common"
import { Parcela } from "./parcela.model"
import { Paga } from "./paga.model"
import * as moment from 'moment';



export class Fatura implements Actiable {
    
    id : string
    nota : string
    data : string
    valor : number
    vencimentoUltimaParcela : string
    vencimentoProximaParcela : string
    parcelas : Array<Parcela>
    docEntry : string;
    isBoleto : Boolean = true

    private _actions : Array<Action>
    

    get dataF(){
        return moment(moment(this.data)).locale("pt-br").format('L');
    }

    get valorCurrency(){
        return formatCurrency(this.valor,'pt','R$')
    }

    get vencimento(){
        return moment(moment(this.vencimentoUltimaParcela)).locale("pt-br").format('L');
    }

    get numParcelas(){
        return this.parcelas.length
    }

    getActions() : Array<Action>{
        if(!this._actions){
            this._actions = [
                new Action("Nota", new ActionReturn("show-nf",this), "fas fa-file-invoice"),
            ];
            if(this.numParcelas > 1)
                this._actions.push(new Action("Parcelas", new ActionReturn("ver-fatura",this)))
            else if(this.isBoleto)                    
            this._actions.push(new Action("Boleto", new ActionReturn("show-boleto",this), "fas fa-barcode"))
        }
        return this._actions
    }

    registraPagamento(list : Array<Paga>){
        list.forEach((p) => {
            this.parcelas.forEach((parcela) => {
                if(parcela.id == p.instId)
                    parcela.pago = true;
            })
        })
        return list.filter((p) => p.DocNum == this.docEntry).length > 0
    }
}
    

export class FaturaDefinition{
    
    progressBarHtml = 
    `
        <div class="progress">
            <div class="progress-bar" style="width: 70% !important;"></div>
          </div>
          <span class="progress-description">
            {{value}} Complete
          </span>
    `

    getFaturaDefinition() {
        return [
            new Column('Nº Nota', 'nota'),
            new Column('Data', 'dataF'),
            new Column('Parcelas', 'numParcelas'),
            new Column('Valor R$:', 'valorCurrency'),
            // new Column('Vencimento Proxima Parcela', 'vencimentoProximaParcela'),
            new Column('Termina em', 'vencimento')
        ]   
    }
}