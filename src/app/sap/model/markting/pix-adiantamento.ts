import { formatCurrency } from '@angular/common';
import * as moment from 'moment';
import { Action, ActionReturn } from '../../../shared/components/action/action.model';
import { StatusTypes } from '../labels/status-types';

export class PixAdiantamento {
  DueDate?: string | null;
  Total?: number | null;
  Status?: string | null;
  InstallmentId?: number | null;
  PaymentOrdered?: string | null;
  Percentage?: string | null;
  TotalFC?: number | null;
  dueDate?: string | null;
  total?: number | null;
  status?: string | null;
  installmentId?: number | null;
  paymentOrdered?: string | null;
  percentage?: string | null;
  totalFC?: number | null;
  U_QrCodePix?: string | null;
  U_pix_textContent?: string | null;
  U_pix_link?: string | null;
  U_pix_reference?: string | null;
  U_pix_due_date?: string | null;
  DocEntry?: number | null;
  docEntry?: number | null;
  TaxaJurosMoraPercent?: number | null;
  taxaJurosMoraPercent?: number | null;
  JurosValor?: number | null;
  jurosValor?: number | null;
  ValorTitulo?: number | null;
  valorTitulo?: number | null;
  ValorTotal?: number | null;
  valorTotal?: number | null;
  DocNum?: number | null;
  docNum?: number | null;

  checkingStatus = false;

  get pixReferenceLabel(): string {
    return this.U_pix_reference ?? '-';
  }

  get docNumLabel(): string {
    const docNum = this.DocNum ?? this.docNum;
    return docNum != null ? String(docNum) : '-';
  }

  get expirationDate(): string | null {
    return this.U_pix_due_date ?? this.DueDate ?? this.dueDate ?? null;
  }

  get expirationDateLabel(): string {
    if (!this.expirationDate) {
      return '-';
    }

    const data = moment(this.expirationDate);
    return data.isValid() ? data.format('DD/MM/YYYY HH:mm') : this.expirationDate;
  }

  get statusAdiantamento(): string {
    const status = this.Status ?? this.status;
    if (!status) {
      return '-';
    }

    return StatusTypes[status as keyof typeof StatusTypes] ?? status;
  }

  get valorPix(): string {
    const valor = Number(this.ValorTotal ?? this.valorTotal ?? this.Total ?? this.total ?? 0);
    return formatCurrency(valor, 'pt', 'R$');
  }

  get pixLinkHtml(): string {
    const link = this.getPixLinkUrl();
    if (!link) {
      return '<span class="text-muted">-</span>';
    }

    const safeLink = link.replace(/"/g, '&quot;');
    return `<a href="${safeLink}" target="_blank" rel="noopener noreferrer">Abrir link</a>`;
  }

  getActions(): Action[] {
    const retorno = new ActionReturn('consultar-status-pix-adiantamento', this);
    retorno.carregando = this.checkingStatus;

    return [
      new Action('Consultar Status', retorno, 'fas fa-search-dollar')
    ];
  }

  private getPixLinkUrl(): string | null {
    const qrCode = this.U_QrCodePix ?? this.U_pix_textContent;
    if (!qrCode || !this.expirationDate) {
      return null;
    }

    const payload = {
      qrCode,
      valor: this.ValorTotal ?? this.valorTotal ?? this.Total ?? this.total,
      vencimento: this.expirationDate,
    };
    const encoded = btoa(JSON.stringify(payload));
    return `${window.location.origin}/pix-link?d=${encoded}`;
  }
}
