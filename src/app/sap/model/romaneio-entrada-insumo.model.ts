

export class RomaneioEntradaInsumo{
    U_NumeroTicket : number
    U_PesoNota : number
    U_PesoBruto : number
    U_PesoTara : number
    U_PlacaCaminhao : string
    U_NumeroBoletim : string
    U_DataEntrada : Date
    DocEntry : number
    U_PesoLiquido : number
    U_PesoLiquidoDesc : number
    U_Diferenca : number
    U_CodFazenda : string
    U_DscFazenda : string
    U_CodSafra: string
    U_DscSafra : string
    U_CodResponsavel : string
    U_NomeResponsavel : string
    U_CodTransportador : string //Parceiro Negocio
    U_NomeTransportador : string
    U_CodMotorista: string; //Objeto customizado
    U_Motorista : string //Objeto customizado
    U_CodRegistroCompra: string
    U_CodParceiroNegocios: string
    U_CodDeposito: string
    U_TipoRomaneio = "G"
    PECU_REGACollection = Array<TipoAnalise>()

}

export class TipoAnalise{
    U_CodTipoAnalise : string
    U_DscTipoAnalise : string
    U_ValorEncontrado  : string
    U_DscUnidadeMedida : string
    U_DescontoPeso : string
}