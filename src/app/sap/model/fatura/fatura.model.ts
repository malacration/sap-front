import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { Column } from "../../../shared/components/table/column.model"


export class Fatura implements Actiable {
    
    id : string
    data : string
    valor : number
    parcelas : number
    vencimentoUltimaParcela : string
    vencimentoProximaParcela : string

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
            new Column('Data', 'data'),
            new Column('Parcelas', 'parcelas', this.progressBarHtml),
            new Column('Valor R$:', 'valor'),
            new Column('Vencimento Proxima Parcela', 'vencimentoProximaParcela'),
            new Column('Vencimento ultima parcela', 'vencimentoUltimaParcela')
        ]   
    }
}