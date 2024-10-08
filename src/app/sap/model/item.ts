import { Column } from "../../shared/components/table/column.model"
import { Action, ActionReturn } from "../../shared/components/action/action.model"
import { formatCurrency } from "@angular/common"
import { DocumentLines } from "../components/document/documento.statement.component"
import { disconnect } from "process"
import Big from 'big.js';


export class Item{
    ItemCode : string
    ItemDescription : string
    quantidade : number
    SalUnitMsr : string
    UnitPrice : number
    urlImagem : string
    desconto : number = 0
    PriceList : string
    ListName : string
    GroupNum : string
    descontoCondicaoPagamento : number 
    jurosCondicaoPagamento : number 
    OnHand: number 


    getDefinition() {
        return [
            new Column('Id', 'ItemCode'),
            new Column('Nome', 'ItemDescription'),
            new Column('Preço', 'unitPriceBrl'),
            new Column('Tabela', 'ListName'),
            new Column('Estoque', 'OnHand')
        ]   
    }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-check-circle")
        ]
    }

    toString(){
        return this.ItemDescription
    }

    formula(): number {
        let price = new Big(this.UnitPrice);
        let discount = new Big(this.descontoCondicaoPagamento || 0).div(100);
        let interest = new Big(this.jurosCondicaoPagamento || 0).div(100);

        let discountFactor = new Big(1).minus(discount);
        let interestFactor = new Big(1).plus(interest);

        let result = price
            .times(discountFactor)
            .times(interestFactor);

        return result.toFixed(2, Big.roundHalfUp);
    }

    unitPriceBrl(){
        return formatCurrency(this.formula(), 'pt', 'R$');
    }

    unitPriceLiquid() : number{
        return this.formula();
    }

    totalSemFormatacao(): number {
        let quantidade = new Big(this.quantidade);
        let unitPriceLiquid = new Big(this.unitPriceLiquid());
    
        let total = quantidade.times(unitPriceLiquid); 
    
        return total.toNumber().toFixed(2, Big.roundHalfUp); 
    }

    total(){
        return formatCurrency(this.totalSemFormatacao(),'pt','R$')
    }

    getDocumentsLines(usage) : DocumentLines{
        let doc = new DocumentLines()
        doc.ItemCode = this.ItemCode
        doc.Quantity = this.quantidade
        doc.PriceList = this.PriceList
        doc.Usage = usage
        doc.DiscountPercent = this.desconto
        doc.U_preco_negociado = this.unitPriceLiquid()
        doc.UnitPrice = this.unitPriceLiquid()
        return doc
    }
}