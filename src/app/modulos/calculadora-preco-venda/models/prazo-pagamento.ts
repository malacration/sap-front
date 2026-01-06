export class PrazoPagamento {
    descricao: string;
    fator: number;

    constructor(descricao: string, fator: number = 0) {
        this.descricao = descricao;
        this.fator = fator;
    }
}