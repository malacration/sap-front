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
    // U_Data é db_Date de UDT - o SAP sempre devolve como meia-noite UTC
    // ("2026-07-27T00:00:00Z"). Parsear e formatar em UTC (sem converter pro
    // fuso do navegador) evita que a data "role" um dia pra trás em fusos
    // atrás de UTC (Brasil) - o "00:00:00Z" não é um horário real, é só como
    // o SAP serializa um campo que só tem data.
    // Linha (bott_MasterDataLines) não ganha CreateDate/CreateTime como a
    // master ganha, então a hora vem do nosso próprio campo U_Hora.
    const data = moment.utc(this.U_Data, ['YYYY-MM-DD', moment.ISO_8601, 'YYYYMMDD'], true);
    if (!data.isValid()) {
      return '';
    }
    const hora = this.U_Hora ? ` ${this.U_Hora}` : '';
    return data.format('DD/MM/YYYY') + hora;
  }
}
