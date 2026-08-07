import { formatCurrency } from '@angular/common';
import * as moment from 'moment';
import { Action, ActionReturn } from '../../../shared/components/action/action.model';
import { ReplaceFilial } from '../../../utils/replaceFilial';

export class CobrancaTitulo {
  Tipo: string; // "NF" (fatura) ou "AD" (adiantamento) - obrigatório em toda chamada de escrita
  DocEntry: number;
  DocNum: number;
  Serial: string;
  Series: number;
  BPLId: number;
  BPLName: string;
  CardCode: string;
  CardName: string;
  DocDate: string;
  DocTotal: number;
  SlpCode: number;
  SlpName: string;
  InstlmntID: number;
  InsTotal: number;
  PaidToDate: number;
  DueDate: string;
  Saldo: number;
  DiasAtraso: number;
  SituacaoSap: string;
  U_Status: string;
  U_Cobrador: string;
  U_Acao: string;
  U_Situacao: string;
  U_Ocorrencia: string;
  U_Observacao: string;
  U_DataAcao: string;
  U_DataPromessa: string;

  // Somente no front, para marcar linhas antes de aplicar uma ação em lote.
  selecionado = false;

  static from(json: any): CobrancaTitulo {
    return Object.assign(new CobrancaTitulo(), json);
  }

  getActions(): Action[] {
    return [
      new Action(
        this.selecionado ? 'Selecionado' : 'Selecionar',
        new ActionReturn('cobranca-toggle-selecao', this),
        this.selecionado ? 'fas fa-check-square' : 'far fa-square',
        this.selecionado ? 'success' : 'secondary'
      ),
      new Action('Registrar', new ActionReturn('cobranca-registrar', this), 'fas fa-comment-dots'),
      new Action('Histórico', new ActionReturn('cobranca-historico', this), 'fas fa-history', 'info'),
    ];
  }

  get code(): string {
    return `${this.Tipo}-${this.DocEntry}-${this.InstlmntID}`;
  }

  get tipoLabel(): string {
    return this.Tipo === 'AD' ? 'Adiantamento' : 'Nota Fiscal';
  }

  get filialFormatada(): string {
    const nome = ReplaceFilial.limparFilial(this.BPLName);
    if (nome) {
      return nome;
    }
    return this.BPLId != null ? `Filial ${this.BPLId}` : '';
  }

  get docDateFormatado(): string {
    return this.formatarData(this.DocDate);
  }

  get vencimentoFormatado(): string {
    return this.formatarData(this.DueDate);
  }

  get dataAcaoFormatada(): string {
    return this.formatarData(this.U_DataAcao);
  }

  get dataPromessaFormatada(): string {
    return this.formatarData(this.U_DataPromessa);
  }

  get insTotalCurrency(): string {
    return formatCurrency(this.InsTotal ?? 0, 'pt', 'R$');
  }

  get saldoCurrency(): string {
    return formatCurrency(this.Saldo ?? 0, 'pt', 'R$');
  }

  get serieFormatada(): string {
    return this.Serial || `${this.DocNum}`;
  }

  get jaEmAcompanhamento(): boolean {
    return !!this.U_Status;
  }

  // Sem acompanhamento, essas colunas ficavam vazias na tabela - "1 - NÃO INICIADO" já é
  // a opção do domínio Status pra esse caso, então usa ela em vez de deixar em branco. As
  // outras não têm um valor de domínio equivalente a "nada ainda", então só um traço.
  get statusFormatado(): string {
    return this.U_Status || '1 - NÃO INICIADO';
  }

  get cobradorFormatado(): string {
    return this.U_Cobrador || '—';
  }

  get acaoFormatada(): string {
    return this.U_Acao || '—';
  }

  get situacaoFormatada(): string {
    return this.U_Situacao || '—';
  }

  get ocorrenciaFormatada(): string {
    return this.U_Ocorrencia || '—';
  }

  get situacaoSapLabel(): string {
    return this.SituacaoSap === 'PAGO' ? 'Pago' : 'Aberto';
  }

  private formatarData(valor: string): string {
    if (!valor) {
      return '';
    }
    return moment(valor, 'YYYYMMDD').format('DD/MM/YYYY');
  }
}
