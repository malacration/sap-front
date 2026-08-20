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
  // Data prometida NESTA ação (o cabeçalho do título guarda a vigente).
  U_DataPromessa: string;
  // Quem pode remover é decidido no backend (autoria por U_UsuarioId): no login por Keycloak o
  // token daqui não carrega o User.id do SAP, então a tela não tem como reproduzir a regra.
  PodeRemover: boolean;

  get promessaFormatada(): string {
    if (!this.U_DataPromessa) {
      return '';
    }
    const data = moment.utc(this.U_DataPromessa, ['YYYY-MM-DD', moment.ISO_8601, 'YYYYMMDD'], true);
    return data.isValid() ? data.format('DD/MM/YYYY') : '';
  }

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
