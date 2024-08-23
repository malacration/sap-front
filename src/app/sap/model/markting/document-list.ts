import { formatCurrency } from "@angular/common";
import { Action, ActionReturn } from "../../../shared/components/action/action.model";
import * as moment from "moment";

export class DocumentList{

    CardCode : string
    CardName : string
    DocNum  : string
    DocDate  : string
    DocDueDate : string
    DocTotal : number
    tipo : string
    DocumentAdditionalExpenses : Array<DespesaAdiciona>

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-check-circle")
        ]
    }

    get totalCurrency(){
        return formatCurrency(this.DocTotal,'pt','R$')
    }
    
    get frete(){
        if(!this.DocumentAdditionalExpenses)
            this.DocumentAdditionalExpenses = new Array()
        let frete = this.DocumentAdditionalExpenses.reduce((acc,it) => acc+it.LineTotal,0) 
        return frete
    }

    get freteCurrency(){
        return formatCurrency(this.frete,'pt','R$')
    }

    get produtosCurrency(){
        return formatCurrency(this.DocTotal-this.frete,'pt','R$')
    }

    get dataCriacao(){
        return moment(this.DocDate).format('DD/MM/YYYY'); 
    }

    get situacao(){
        return "indefinida"
    }

    get vencimento(){
        return moment(this.DocDueDate).format('DD/MM/YYYY'); 
    }
}

export class DespesaAdiciona{
    LineTotal : number
}