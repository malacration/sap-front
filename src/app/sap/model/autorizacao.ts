import { Actiable, Action, ActionReturn } from "../../shared/components/action/action.model"

const TIPO_DOCUMENTO_LABEL : { [tipo : string] : string } = {
    COTACAO : 'Cotação',
    PEDIDO_VENDA : 'Pedido de Venda',
}

const STATUS_LABEL : { [status : string] : string } = {
    PENDENTE : 'Pendente',
    APROVADO : 'Aprovado',
    REJEITADO : 'Rejeitado',
}

export class Autorizacao implements Actiable {
    Code : number
    Name : string
    U_tipoDocumento : string
    U_motivo : string
    U_cardCode : string
    U_cardName : string
    U_valor : number
    U_status : string = 'PENDENTE'
    U_solicitante : string
    U_autorizador : string
    U_observacao : string
    U_docEntryCriado : number

    get pendente() : boolean {
        return this.U_status == 'PENDENTE'
    }

    tipoDocumentoLabel() : string {
        return TIPO_DOCUMENTO_LABEL[this.U_tipoDocumento] || this.U_tipoDocumento
    }

    statusLabel() : string {
        return STATUS_LABEL[this.U_status] || this.U_status
    }

    //acoes so aparecem enquanto pendente - depois de decidido a linha vira so
    //historico (fica visivel na aba de auditoria, sem acao)
    getActions() : Array<Action> {
        if(!this.pendente)
            return []
        return [
            new Action('Aprovar', new ActionReturn('aprovar', this), 'fas fa-check', 'success'),
            new Action('Rejeitar', new ActionReturn('rejeitar', this), 'fas fa-times', 'danger'),
        ]
    }

    toString(){
        return this.Name || String(this.Code)
    }
}
