import { formatCurrency } from "@angular/common";
import { Action, ActionReturn } from "../../../shared/components/action/action.model";
import * as moment from "moment";
import { Input } from "@angular/core";
import { RouteLink } from "../route-link";

export class DocumentList{
    CardCode : string
    CardName : string
    DocNum  : string
    DocDate  : string
    DocDueDate : string
    DocTotal : number
    tipo : string
    DocumentStatus : string
    DocumentAdditionalExpenses : Array<DespesaAdiciona>
    DocumentLines: DocumentLines[];
    DocStatus : string
    Devolucao : string
    SequenceSerial: string; 

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selectedDocumentList",this), "far fa-check-circle")
        ]
    }

    routerLink() : RouteLink{
        return new RouteLink(this.CardCode,"/clientes/parceiro-negocio/"+this.CardCode)
    }

    get x(){
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
        if(this.DocumentStatus == "bost_Open"){
            return "Aberto"
        }else{
            return "Fechado"
        }
            
    }

    get situacaoBoleto(){
        if(this.Devolucao != null&& this.Devolucao != undefined)
            return "Cancelado"
        else if(this.DocStatus == "C"){
            return "Fechado"
        }else{
            return "Aberto"
        }
            
    }

    get totalCurrency(){
        return formatCurrency(this.DocTotal-this.frete,'pt','R$')
    }

    get vencimento(){
        return moment(this.DocDueDate).format('DD/MM/YYYY'); 
    }
}

export class DespesaAdiciona{
    LineTotal : number
}

export class DocumentLines {

    UnitPrice : number
    LineTotal : number
    Quantity : number
    ItemDescription : string
    ItemCode : string

    get precoUnitarioCurrency(){
        return formatCurrency(this.UnitPrice,'pt','R$')
    }

    get quantityCurrency(){
        return formatCurrency(this.Quantity,'pt','')
    }
    
    get lineTotalCurrency(){
        return formatCurrency(this.LineTotal,'pt','R$')
    }

    get produtosCurrency(){
        return formatCurrency(this.UnitPrice*this.Quantity,'pt','R$')
    }
    
}
