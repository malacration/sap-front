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
    AR_CF_LINHACollection: LinhaItem[] = Array();
    U_vendedor: number;
    U_cardName: string;
    U_valorFrete: number;
    DocEntry: number;
    U_dataCriacao: string;
    DocNum: number;
    U_filial
    U_status

    SalesEmployeeName : string
    OrderDocNum : string
    Bplname : string
    TotalProdutosCalculado : number
    
    entregas : Array<FutureDeliverySales> = null
    entregaLoading = false

    
    routerLinkPn() : RouteLink{
        return new RouteLink(this.U_cardName,"/clientes/parceiro-negocio/"+this.U_cardCode) 
    }

    isVerEntregas() : boolean{
        return !this.entregaLoading
    }

    getActions(): Action[] {
        return [
            new Action("Abrir", new ActionReturn("selected",this), "fas fa-external-link-alt"),
            
            this.isVerEntregas() ? 
                new Action("Carregar Entregas", new ActionReturn("carregaEntregas",this)) 
                : 
                new Action("Carregando...", new ActionReturn("none",this),"fa-solid fa-spinner fa-spin")
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

    get replaceFilial(){
        return this.Bplname
            .replace("SUSTENNUTRI NUTRICAO ANIMAL LTDA","")
            .replace("SUSTENNUTRI NUTRIÇAO ANIMAL LTDA","").replace("- ","").trim()
    }

    get totalCurrency() {
        return formatCurrency(this.U_valorFrete + this.TotalProdutosCalculado, 'pt', 'R$');
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

    get TotalProdutosCalculadoCurrency(){
        return this.TotalProdutosCalculado
    }

    get produtosCurrency() {
        return this.totalProdutos;
    }

    get totalProdutos() {
        if(this.AR_CF_LINHACollection)
            return this.AR_CF_LINHACollection.reduce((acc, it) => acc + it.total, 0);
        else   
            return undefined
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