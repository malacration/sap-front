import { formatCurrency } from "@angular/common";
import { Action, ActionReturn } from "../../../shared/components/action/action.model";
import * as moment from "moment";
import { RouteLink } from "../route-link";
import { ReplaceFilial } from "../../../utils/replaceFilial";

export class DocumentList{
    CardCode : string
    CardName : string
    DocNum  : string
    DocEntry : number
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
    BPL_IDAssignedToInvoice : number
    BPLName : string
    SlpName : string
    DocObjectCode : string

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
        if(this.DocumentStatus === 'O' || this.DocumentStatus === 'bost_Open') return 'Aberto';
        if(this.DocumentStatus === 'C' || this.DocumentStatus === 'bost_Close') return 'Fechado';
        return '';
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
        return formatCurrency(this.DocTotal,'pt','R$')
    }

    get vencimento(){
        return moment(this.DocDueDate).format('DD/MM/YYYY');
    }

    get filialFormatada(): string {
        return ReplaceFilial.limparFilial(this.BPLName);
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
