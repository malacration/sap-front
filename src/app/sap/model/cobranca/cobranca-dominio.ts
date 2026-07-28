export class CobrancaDominio {
  Code: string;
  U_Tipo: string;
  U_Codigo: string;
  U_Descricao: string;
  U_Ordem: number;
  U_Ativo: string;

  get rotulo(): string {
    return `${this.U_Codigo} - ${this.U_Descricao}`;
  }
}
