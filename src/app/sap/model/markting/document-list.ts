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
    DocumentInstallments: DocumentInstallment[] = [];
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

    orderRouterLink(): RouteLink {
        return new RouteLink(this.DocNum, "/venda/pedidos-venda", { id: this.DocEntry });
    }

    quotationRouterLink(): RouteLink {
        return new RouteLink(this.DocNum, "/venda/cotacao", { id: this.DocEntry });
    }

    invoiceRouterLink(): RouteLink {
        return new RouteLink(this.DocNum, "/financeiro/notas-fiscais", { id: this.DocEntry });
    }

    downPaymentRouterLink(): RouteLink {
        return new RouteLink(this.DocNum, "/financeiro/adiantamentos", { id: this.DocEntry });
    }

    creditNoteRouterLink(): RouteLink {
        return new RouteLink(this.DocNum, "/financeiro/devolucoes", { id: this.DocEntry });
    }

    incomingPaymentRouterLink(): RouteLink {
        return new RouteLink(this.DocNum, "/financeiro/recebimentos", { id: this.DocEntry });
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
        if(!this.DocDueDate)
            return '-';
        return moment(this.DocDueDate).format('DD/MM/YYYY');
    }

    get filialFormatada(): string {
        const filial = this.BPLName
            || (this as any).BPLNameAssignedToInvoice
            || (this as any).BplName
            || (this as any).Bplname
            || (this as any).bplName
            || (this as any).bplname;
        return filial ? ReplaceFilial.limparFilial(filial) : '-';
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
    SalesPersonCode : number | null

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

export class DocumentInstallment {
    InstallmentId : number
    DueDate : string
    dueDate : string
    total : number
    Total : number
    Percentage : string
    Status : string
    U_pix_reference : string

    get parcela(){
        return this.InstallmentId ?? '-'
    }

    get vencimento(){
        const data = this.DueDate || this.dueDate
        return data ? moment(data).format('DD/MM/YYYY') : '-'
    }

    get valorCurrency(){
        return formatCurrency(this.valor, 'pt', 'R$')
    }

    get valor(){
        return Number(this.Total ?? this.total ?? 0)
    }

    get percentual(){
        return this.Percentage ? `${this.Percentage}%` : '-'
    }

    get statusFormatado(){
        if(this.Status === 'O' || this.Status === 'bost_Open') return 'Aberta'
        if(this.Status === 'C' || this.Status === 'bost_Close' || this.Status === 'bost_Paid') return 'Fechada'
        return this.Status || '-'
    }

    get pixReferencia(){
        return this.U_pix_reference || '-'
    }
}
