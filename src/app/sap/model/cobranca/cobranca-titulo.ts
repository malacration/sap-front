import { formatCurrency } from '@angular/common';
import * as moment from 'moment';
import { Action, ActionReturn } from '../../../shared/components/action/action.model';
import { ReplaceFilial } from '../../../utils/replaceFilial';

export class CobrancaTitulo {
  // Título nunca trabalhado não tem registro na UDT, então U_Status vem vazio - este é o
  // rótulo que a tela exibe no lugar. É um valor de domínio real também (o seeder cria
  // "1 - NÃO INICIADO"), por isso filtrar por ele tem que casar os dois casos.
  static readonly STATUS_NAO_INICIADO = '1 - NÃO INICIADO';

  Tipo: string;
  DocEntry: number;
  DocNum: number;
  Serial: string;
  Series: number;
  BPLId: number;
  BPLName: string;
  CardCode: string;
  CardName: string;
  Telefone: string;
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

  // Identifica a parcela sem depender do cliente: o mesmo cliente costuma ter mais de um
  // título em aberto (NF e adiantamento, ou parcelas diferentes), e só o nome dele não diz
  // em qual linha a ação está sendo registrada.
  get identificacao(): string {
    const documento = this.Tipo === 'AD' ? 'Adiantamento' : 'NF';
    return `${documento} ${this.serieFormatada} parcela ${this.InstlmntID}`;
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

  get telefoneFormatado(): string {
    // `from` é Object.assign de JSON cru do SAP, então o tipo `string` é ficção de
    // compilação - telefone numérico chegaria como number e o .replace estouraria aqui
    // dentro, derrubando a renderização de toda a tabela, não só desta célula.
    const texto = this.Telefone == null ? '' : `${this.Telefone}`;
    if (!texto.trim()) {
      return '—';
    }
    const digitos = texto.replace(/\D/g, '');
    if (digitos.length === 11) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    }
    if (digitos.length === 10) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    }
    return texto;
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

  get statusFormatado(): string {
    return this.U_Status || CobrancaTitulo.STATUS_NAO_INICIADO;
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
