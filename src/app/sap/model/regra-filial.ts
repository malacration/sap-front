import { Actiable, Action, ActionReturn } from "../../shared/components/action/action.model"

/**
 * Em que filiais uma regra do motor de autorizacao esta ativa (motivo -> filial).
 * Motivo sem nenhuma linha cadastrada vale em TODA filial.
 */
export class RegraFilial implements Actiable {
    //Code do UDO e alfanumerico no service layer, nao numerico - mesma pegadinha do
    //Comissao/Autorizador, onde tipar como number quebrava a leitura da lista inteira
    Code : string
    Name : string
    U_motivo : string
    U_filial : string

    //preenchido na tela a partir da lista de filiais, so para exibicao: o backend
    //guarda e devolve apenas o BPLId
    filialNome : string

    getActions() : Array<Action> {
        return [
            new Action('Remover', new ActionReturn('remover', this), 'fas fa-trash', 'danger'),
        ]
    }

    toString(){
        return this.Name || String(this.Code)
    }
}
