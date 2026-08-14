import { Actiable, Action, ActionReturn } from "../../shared/components/action/action.model"

export class CondicaoComissao {
    Code? : number
    LineId? : number
    U_prazo : number
    U_desconto : number = 0
    U_juros : number = 0
}

export class LiberadoPara {
    Code? : number
    LineId? : number
    U_Filial : string
    U_vendedor : string
}

export class Comissao implements Actiable {
    Code : number
    Name : string
    U_porcentagem : number = 0
    //desconto maximo (%) que o vendedor pode dar numa venda vinculada a essa comissao
    U_desconto : number = 0
    //"0"/"1" vindo do service layer
    U_regressiva : string = '0'
    //nomeados igual ao Service Layer (Regiao.ts segue a mesma convencao) - o
    //Object.assign do ComissaoService faz copia crua, sem renomear chaves
    CONDICOESFVCollection : Array<CondicaoComissao> = []
    LIBERAPARACollection : Array<LiberadoPara> = []

    get regressiva() : boolean {
        return this.U_regressiva == '1'
    }

    regressivaLabel() : string {
        return this.regressiva ? 'Sim' : 'Não'
    }

    //"0" e o valor de "Nenhuma" no ValidValuesMD de U_Filial (ComissaoConfiguration.kt) -
    //conta so as linhas que de fato restringem por filial/vendedor
    qtdFiliaisLiberadas() : number {
        return (this.LIBERAPARACollection || []).filter(l => l.U_Filial && l.U_Filial !== '0').length
    }

    qtdVendedoresLiberados() : number {
        return (this.LIBERAPARACollection || []).filter(l => !!l.U_vendedor).length
    }

    getActions() : Array<Action> {
        return [
            new Action("", new ActionReturn("selecionar", this), "far fa-edit")
        ]
    }

    toString(){
        return this.Name || String(this.Code)
    }
}
