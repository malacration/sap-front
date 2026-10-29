import { Option } from "../../../sap/model/form/option"

// Valores aceitos pelo backend em ?status= (StatusOrdemProducao no sap-rovema).
export const STATUS_ORDEM_PRODUCAO : Array<Option> = [
    new Option('PLANEJADA', 'Planejada'),
    new Option('LIBERADA', 'Liberada'),
    new Option('FECHADA', 'Fechada'),
    new Option('CANCELADA', 'Cancelada'),
]

const ROTULO_STATUS_SAP : Record<string, string> = {
    boposPlanned: 'Planejada',
    boposReleased: 'Liberada',
    boposClosed: 'Fechada',
    boposCancelled: 'Cancelada',
}

// O Service Layer devolve data como "2026-10-20" ou "2026-10-20T00:00:00Z"; a tela e o PDF mostram dd/mm/aaaa.
export function dataBr(valor : string) : string {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '')
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : (valor ?? '')
}

export function numeroBr(valor : number, casas = 2) : string {
    if(valor == null || isNaN(valor))
        return ''
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })
}

// Soma dias a uma data do Service Layer e devolve dd/mm/aaaa (validade = fabricacao + dias do cadastro).
export function somaDiasBr(valor : string, dias : number) : string {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '')
    if(!partes || dias == null)
        return ''
    const data = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]) + dias))
    return dataBr(data.toISOString())
}

// Cadastro do produto acabado (OITM + estrutura), montado pelo backend no detalhe da ordem.
export class ProdutoDaOrdem {
    ValidadeDias : number
    PesoSaco : number
    UnidadeVenda : string
    Formula : number
}

export class OrdemProducaoLinha {
    LineNumber : number
    ItemNo : string
    ItemName : string
    // pit_Item (materia-prima), pit_Resource (recurso/maquina) ou pit_Text
    ItemType : string
    BaseQuantity : number
    PlannedQuantity : number
    IssuedQuantity : number
    Warehouse : string
}

export class OrdemProducao {
    AbsoluteEntry : number
    DocumentNumber : number
    ItemNo : string
    ProductDescription : string
    ProductionOrderStatus : string
    PlannedQuantity : number
    CompletedQuantity : number
    RejectedQuantity : number
    PostingDate : string
    StartDate : string
    DueDate : string
    Warehouse : string
    Remarks : string
    // Numero de bateladas (campo do SysFeed na OWOR). Vem so no detalhe.
    U_LbrOne_Batelada : number
    // Numero da ordem no SysFeed e lote do produto acabado (campos de usuario da OWOR).
    U_sysfeed_numero : string
    U_lote_producao : string
    ProductionOrderLines : Array<OrdemProducaoLinha> = []
    // So no detalhe.
    Produto : ProdutoDaOrdem

    // Campos derivados para a tabela (app-table le propriedade, nao chama metodo).
    status : string
    produto : string
    lancamento : string
    inicio : string
    vencimento : string

    static from(json : any) : OrdemProducao {
        const ordem = Object.assign(new OrdemProducao(), json)
        ordem.ProductionOrderLines = ordem.ProductionOrderLines ?? []
        ordem.status = ROTULO_STATUS_SAP[ordem.ProductionOrderStatus] ?? ordem.ProductionOrderStatus
        ordem.produto = [ordem.ItemNo, ordem.ProductDescription].filter(Boolean).join(' - ')
        ordem.lancamento = dataBr(ordem.PostingDate)
        ordem.inicio = dataBr(ordem.StartDate)
        ordem.vencimento = dataBr(ordem.DueDate)
        return ordem
    }

    // Produto com codigo, como no cadastro: "PDC0000002 - OX REPRODUÇÃO".
    get produtoComCodigo() : string {
        return [this.ItemNo, this.ProductDescription].filter(Boolean).join(' - ')
    }

    get dataFabricacao() : string {
        return this.StartDate || this.PostingDate
    }

    get validade() : string {
        return somaDiasBr(this.dataFabricacao, this.Produto?.ValidadeDias)
    }

    // Ordem de embalagem: produto ensacado (PAC). A quantidade planejada dela ja e em sacos.
    get ensacado() : boolean {
        return (this.ItemNo ?? '').toUpperCase().startsWith('PAC')
    }

    get sacosPrevistos() : number {
        return this.ensacado ? this.PlannedQuantity : null
    }

    get pesoSaco() : number {
        return this.ensacado ? this.Produto?.PesoSaco : null
    }

    // Saco da ordem de embalagem: a linha de embalagem (EMB...) da estrutura, ex.: "SACARIA POWER 60x90".
    get sacaria() : OrdemProducaoLinha {
        return this.ProductionOrderLines.find(it => (it.ItemNo ?? '').toUpperCase().startsWith('EMB'))
    }

    get tamanhoSacaria() : string {
        return /(\d+\s*[xX]\s*\d+)/.exec(this.sacaria?.ItemName ?? '')?.[1] ?? ''
    }

    get bateladas() : number {
        return this.U_LbrOne_Batelada > 0 ? this.U_LbrOne_Batelada : null
    }

    // Peso de uma batida (kg): quantidade planejada dividida pelas bateladas.
    get pesoBatida() : number {
        return this.bateladas ? this.PlannedQuantity / this.bateladas : null
    }

    // Insumos que vao na batida: tudo que nao e recurso (maquina/mao de obra) nem linha de texto.
    get materiasPrimas() : Array<OrdemProducaoLinha> {
        return this.ProductionOrderLines.filter(it => it.ItemType != 'pit_Resource' && it.ItemType != 'pit_Text')
    }

    kgPorBatida(linha : OrdemProducaoLinha) : number {
        return this.bateladas ? linha.PlannedQuantity / this.bateladas : null
    }
}
