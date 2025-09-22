import { Column } from "../../shared/components/table/column.model"
import { Action, ActionReturn } from "../../shared/components/action/action.model"
import { formatCurrency } from "@angular/common"
import Big from 'big.js';
import { LinhasPedido } from "../components/document/documento.statement.component";


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
    descontoVendedorPorcentagem : number = 0
    PriceUnit
    MeasureUnit

    get idProduto(){
        return this.ItemCode
    }

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
        return this.antesDescontoFinanceiro()
            .times(Big(100).minus(this.descontoVendedorPorcentagem).div(100))
            .toFixed(2, Big.roundHalfUp);
    }

    antesDescontoFinanceiro() : Big{
        let price = new Big(this.UnitPrice);
        let discount = new Big(this.descontoCondicaoPagamento || 0).div(100);
        let interest = new Big(this.jurosCondicaoPagamento || 0).div(100);

        let discountCondicaoPagamento = new Big(1).minus(discount)
        let interestFactor = new Big(1).plus(interest);

        let result = price
            .times(discountCondicaoPagamento)
            .times(interestFactor);

        return result
    }

    antesDescontoFinanceiroNumber() : number{
        return this.antesDescontoFinanceiro().toFixed(4, Big.roundHalfUp);
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

    getDocumentsLines(usage) : LinhasPedido{
        let doc = new LinhasPedido()
        doc.ItemCode = this.ItemCode
        doc.Quantity = this.quantidade
        doc.PriceList = this.PriceList
        doc.Usage = usage
        doc.U_preco_negociado = this.unitPriceLiquid()
        doc.UnitPrice = this.unitPriceLiquid()
        doc.ItemDescription = this.ItemDescription
        doc.MeasureUnit = this.MeasureUnit == undefined ? this.SalUnitMsr : this.MeasureUnit
        doc.DiscountPercent = this.descontoVendedorPorcentagem
        return doc
    }

    aplicaDesconto($event){
        if(typeof $event == 'number')
            this.descontoVendedorPorcentagem = $event
        else if($event instanceof Number)
            this.descontoVendedorPorcentagem = $event.valueOf()
        else if(typeof $event == 'string' && !isNaN(parseFloat($event)))
            this.descontoVendedorPorcentagem = parseFloat($event)
        else
            alert($event+" else"+typeof $event)
    }
}