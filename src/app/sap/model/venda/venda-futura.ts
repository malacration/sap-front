import { formatCurrency } from "@angular/common";
import * as moment from "moment";
import { Action, ActionReturn } from "../../../shared/components/action/action.model";
import { PedidoRetirada } from "./pedido-retirada";
import { RouteLink } from "../route-link";
import { ItemRetirada } from "./item-retirada";
import { DocumentLines, FutureDeliverySales } from "../markting/future-delivery-sales";
import Big from 'big.js';


export class VendaFutura {
    U_orderDocEntry: number;
    U_cardCode: string;
    AR_CF_LINHACollection: LinhaItem[];
    U_vendedor: number;
    U_cardName: string;
    U_valorFrete: number;
    DocEntry: number;
    U_dataCriacao: string;
    DocNum: number;
    U_filial
    U_status
    
    entregas : Array<FutureDeliverySales> = null
    entregaLoading = false

    
    routerLinkPn() : RouteLink{
        return new RouteLink(this.U_cardName,"/clientes/parceiro-negocio/"+this.U_cardCode) 
    }

    isVerEntregas() : boolean{
        return !this.entregaLoading && this.U_status == "aberto"
    }

    getActions(): Action[] {
        return [
            new Action("Abrir", new ActionReturn("selected",this), "fas fa-external-link-alt"),
            
            this.isVerEntregas() ? 
                new Action("Carregar Entregas", new ActionReturn("carregaEntregas",this)) 
                : 
                new Action("Carregando...", new ActionReturn("none",this)) 
        ].filter(it => it != null)
    }

    get valorEntregue(){
        // .filter(it => it.DocObjectCode == 'oInvoices')
        if(this.entregas)
            return formatCurrency(
                this.entregas.reduce((acc,value)=> 
                    value.DocObjectCode == 'oInvoices' ? acc.plus(new Big(value.DocTotal)) : acc.minus(new Big(value.DocTotal)), 
                new Big(0)
            ), 'pt', 'R$');
        else
            return "-"
    }

    get dataCriacao() {
        return moment(this.U_dataCriacao).format('DD/MM/YYYY'); 
    }

    get totalCurrency() {
        return formatCurrency(this.U_valorFrete + this.totalProdutos, 'pt', 'R$');
    }

    /**
    * @deprecated The method should not be used use totalCurrency em vez disso
    */
    get totalCurrencyContratoVenda() {
        return this.totalCurrency
    }

    get frete() {
        return formatCurrency(this.U_valorFrete, 'pt', 'R$');
    }

    get produtosCurrency() {
        return this.totalProdutos;
    }

    get totalProdutos() {
        return this.AR_CF_LINHACollection.reduce((acc, it) => acc + it.total, 0);
    }

    getPedidoRetirada(itens : Array<ItemRetirada>,dataEntrega : Date){
        return new PedidoRetirada(this.DocEntry,itens,dataEntrega)
    }
}

export class LinhaItem {
    U_itemCode: string;
    U_description: string;
    U_precoNegociado: number;
    U_quantity: number;
    U_precoBase: number;
    U_desconto: number;
    U_comissao: number;
    U_MeasureUnit: string;
    LineId: number;
    VisOrder: number;
    entregue: number = 0;
    produtoEntregueLoading: boolean = false;

    get total() {
        return this.U_precoNegociado * this.U_quantity;
    }

    get qtdDisponivel() : number {
        return this.U_quantity - this.entregue;
    }

    get totalCurrency() {
        return formatCurrency(this.total, 'pt', 'R$');
    }

    get precoNegociadoCurrency() {
        return formatCurrency(this.U_precoNegociado, 'pt', 'R$');
    }

    get quantidadeEntregue() {
        return this.produtoEntregueLoading ? "Carregando..." : this.entregue.toString();
    }
}