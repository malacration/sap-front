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
        return [
            new Action("Ver", new ActionReturn("ver-fatura",this), "fas fa-eye")
        ]
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
    actionHtml = `<a class="btn btn-primary" (click)="selecionaFatura()"><i class="fas fa-eye"></i> Ver</a>`

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