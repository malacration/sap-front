import * as moment from 'moment';

export class CobrancaHistorico {
  LineId: number;
  U_Data: string;
  U_Hora: string;
  U_Usuario: string;
  U_Cobrador: string;
  U_Status: string;
  U_Acao: string;
  U_Situacao: string;
  U_Ocorrencia: string;
  U_Observacao: string;

  get dataFormatada(): string {
    if (!this.U_Data) {
      return '';
    }
    const data = moment.utc(this.U_Data, ['YYYY-MM-DD', moment.ISO_8601, 'YYYYMMDD'], true);
    if (!data.isValid()) {
      return '';
    }
    const hora = this.U_Hora ? ` ${this.U_Hora}` : '';
    return data.format('DD/MM/YYYY') + hora;
  }
}
