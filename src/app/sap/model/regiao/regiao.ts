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
    //valor por unidade vindo da faixa (distancia/100 x valor da faixa)
    valorFaixaUnidade : number
    //custo fixo da regiao pra trazer o produto da fabrica ate a unidade, por unidade
    custoTransporte : number
    //o que cada unidade custa de frete no fim das contas
    valorUnidade : number
    total : number
}

export class Regiao implements Actiable {
    Code : string
    Name : string
    U_NomeRegiao : string
    U_CodCordenador : string
    U_Filial : number
    //custo por unidade pra trazer o produto da fabrica ate a unidade dessa regiao;
    //soma no valor por unidade da faixa (ver calcularFrete). Regiao cadastrada
    //antes do campo existir vem nula
    U_CustoTransporte : number
    //"0"/"1" vindo do service layer - varias regioes podem compartilhar a
    //mesma filial, mas so uma pode estar ativa por filial ao mesmo tempo
    U_Ativa : string
    AR_REGIAO_LINHASCollection : Array<RegiaoLinha> = new Array()
    AR_REGIAO_FAIXACollection : Array<RegiaoFaixa> = new Array()

    get ativa() : boolean {
        return this.U_Ativa == '1'
    }

    get custoTransporte() : number {
        return Number(this.U_CustoTransporte || 0)
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

    //faixa base: a de menor quantidade minima. A quantidade dela e o minimo para a regiao
    //entregar (ex.: base 50 = so entrega pedido de 50 unidades para cima) - espelha o back
    get faixaBase() : RegiaoFaixa {
        return this.getFaixasOrdenadas().find(f => f.U_QtdeAte != null) ?? null
    }

    get quantidadeMinimaEntrega() : number {
        return this.faixaBase?.U_QtdeAte ?? null
    }

    //toda a informacao (distancia e faixas) ja esta carregada na regiao selecionada,
    //entao a simulacao e um calculo local, sem chamada nenhuma ao backend.
    //quantidadePedido: o minimo de entrega vale para o pedido inteiro - um documento do pedido
    //dividido (por condicao de pagamento) abaixo da base usa a faixa base (mesma regra do back)
    calcularFrete(codLocal : string, quantidade : number, quantidadePedido : number = quantidade) : SimulacaoFrete {
        const distancia = this.getDistancia(codLocal)
        const base = this.faixaBase
        const faixa = this.encontraFaixa(quantidade)
            ?? (base && Math.max(quantidade, quantidadePedido) >= base.U_QtdeAte ? base : null)
        if(distancia == null || !faixa)
            return null
        //U_ValorKm e o valor a cada 100km (evita ter que cadastrar valores
        //fracionados de poucos centavos por km rodado). O custo de transporte
        //da regiao entra por unidade, junto do valor da faixa, entao acompanha
        //o volume do pedido - mesma formula do back (Regiao.calcularFrete)
        const valorFaixaUnidade = (distancia / 100) * faixa.U_ValorKm
        const custoTransporte = this.custoTransporte
        const valorUnidade = valorFaixaUnidade + custoTransporte
        return {
            distancia, quantidade, faixa,
            valorFaixaUnidade, custoTransporte, valorUnidade,
            total : valorUnidade * quantidade
        }
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
