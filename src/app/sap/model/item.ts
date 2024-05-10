import { Column } from "../../shared/components/table/column.model"
import { Action, ActionReturn } from "../../shared/components/action/action.model"
import { formatCurrency } from "@angular/common"
import { DocumentLines } from "../components/document/documento.statement.component"
import { disconnect } from "process"


export class Item{
    ItemCode : string
    ItemDescription : string
    quantidade : number
    SalUnitMsr : string
    UnitPrice : number
    urlImagem : string
    desconto : number = 0
    PriceList : string
    ListName :string


    getDefinition() {
        return [
            new Column('Id', 'ItemCode'),
            new Column('Nome', 'ItemDescription'),
            new Column('Preço', 'unitPriceBrl'),
            new Column('Tabela', 'ListName')
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

    unitPriceBrl(){
        return formatCurrency(this.UnitPrice,'pt','R$')
    }

    total(){
        return formatCurrency(this.quantidade*(this.UnitPrice*(1-this.desconto/100)),'pt','R$')
    }

    getDocumentsLines(usage) : DocumentLines{
        let doc = new DocumentLines()
        doc.ItemCode = this.ItemCode
        doc.Quantity = this.quantidade
        doc.PriceList = this.PriceList
        doc.Usage = usage
        doc.DiscountPercent = this.desconto
        doc.U_preco_negociado = this.UnitPrice
        return doc
    }
}