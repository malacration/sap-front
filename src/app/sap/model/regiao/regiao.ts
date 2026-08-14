import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"

export class RegiaoLinha {
    Code : string
    LineId : number
    U_Locais : string
    U_Distancia : number
}

export class RegiaoFaixa {
    Code : string
    LineId : number
    //quantidade MINIMA pra faixa valer (sempre preenchido). Ex.: 1 = faixa
    //base (cobre a partir do 1o item); 100 = so a partir de 100 itens vendidos
    U_QtdeAte : number
    U_ValorKm : number
}

export class SimulacaoFrete {
    distancia : number
    quantidade : number
    faixa : RegiaoFaixa
    total : number
}

export class Regiao implements Actiable {
    Code : string
    Name : string
    U_NomeRegiao : string
    U_CodCordenador : string
    U_Filial : number
    //"0"/"1" vindo do service layer - varias regioes podem compartilhar a
    //mesma filial, mas so uma pode estar ativa por filial ao mesmo tempo
    U_Ativa : string
    AR_REGIAO_LINHASCollection : Array<RegiaoLinha> = new Array()
    AR_REGIAO_FAIXACollection : Array<RegiaoFaixa> = new Array()

    get ativa() : boolean {
        return this.U_Ativa == '1'
    }

    //as linhas so tem o codigo da localidade, o nome e resolvido pelo front sob demanda.
    //linhas em branco (sem U_Locais) podem existir no UDO e nao contam como localidade
    getLocalidades() : Array<string> {
        return (this.AR_REGIAO_LINHASCollection || [])
            .map(it => it.U_Locais)
            .filter(it => it != null && String(it).trim() !== '')
    }

    get totalLocalidades() : number {
        return this.getLocalidades().length
    }

    getDistancia(codLocal : string) : number {
        const linha = (this.AR_REGIAO_LINHASCollection || []).find(it => it.U_Locais == codLocal)
        return linha?.U_Distancia
    }

    getFaixasOrdenadas() : Array<RegiaoFaixa> {
        return [...(this.AR_REGIAO_FAIXACollection || [])]
            .sort((a, b) => (a.U_QtdeAte ?? Infinity) - (b.U_QtdeAte ?? Infinity))
    }

    //faixa aplicada e a de maior quantidade minima que a quantidade ainda atinge
    //(desconto progressivo por volume): entre as elegiveis, pega a ultima da lista
    //ordenada ascendente, ou seja, o maior minimo <= quantidade
    encontraFaixa(quantidade : number) : RegiaoFaixa {
        const elegiveis = this.getFaixasOrdenadas().filter(f => f.U_QtdeAte != null && quantidade >= f.U_QtdeAte)
        return elegiveis.length > 0 ? elegiveis[elegiveis.length - 1] : null
    }

    //toda a informacao (distancia e faixas) ja esta carregada na regiao selecionada,
    //entao a simulacao e um calculo local, sem chamada nenhuma ao backend
    calcularFrete(codLocal : string, quantidade : number) : SimulacaoFrete {
        const distancia = this.getDistancia(codLocal)
        const faixa = this.encontraFaixa(quantidade)
        if(distancia == null || !faixa)
            return null
        //U_ValorKm e o valor a cada 100km (evita ter que cadastrar valores
        //fracionados de poucos centavos por km rodado)
        return { distancia, quantidade, faixa, total : (distancia / 100) * faixa.U_ValorKm * quantidade }
    }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected", this), "far fa-edit")
        ]
    }

    toString(){
        return this.U_NomeRegiao || this.Name
    }
}
