import * as moment from "moment"
import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { Column } from "../../../shared/components/table/column.model"
import { formatCurrency } from "@angular/common"
import { Parcela } from "./parcela.model"


export class Fatura implements Actiable {
    
    id : string
    nota : string
    data : string
    valor : number
    vencimentoUltimaParcela : string
    vencimentoProximaParcela : string
    parcelas : Array<Parcela>
    

    get dataF(){
        return moment(this.data).format('L');
    }

    get valorCurrency(){
        return formatCurrency(this.valor,'pt','R$')
    }

    get vencimento(){
        return moment(this.vencimentoUltimaParcela).format('L');
    }

    get numParcelas(){
        return this.parcelas.length
    }

    getActions() : Array<Action>{
        return [
            new Action("Ver", new ActionReturn("ver-fatura",this), "fas fa-eye")
        ]
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
    actionHtml = `<a class="btn btn-primary" (click)="selecionaFatura()"><i class="fas fa-eye"></i> Ver</a>`

    getFaturaDefinition() {
        return [
            new Column('Código', 'id'),
            new Column('Nº Nota', 'nota'),
            new Column('Data', 'dataF'),
            new Column('Parcelas', 'numParcelas'),
            new Column('Valor R$:', 'valorCurrency'),
            // new Column('Vencimento Proxima Parcela', 'vencimentoProximaParcela'),
            new Column('Vencimento ultima parcela', 'vencimento')
        ]   
    }
}