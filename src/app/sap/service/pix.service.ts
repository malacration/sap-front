import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

export interface PixGeradoItem {
  DueDate: string;
  Total: number;
  InstallmentId: number;
  PaymentOrdered: string;
  Percentage: string;
  U_QrCodePix: string;
  U_pix_textContent: string;
  U_pix_link: string;
  U_pix_reference: string;
  U_pix_due_date: string;
  TaxaJurosMoraPercent: number;
  JurosValor: number;
  ValorTitulo: number;
  ValorTotal: number;
}

export interface PixPagamentoStatus {
  txId: string;
  paid: boolean;
  receivedAmount: number | null;
  originalAmount: number | null;
  paymentDate: string | null;
  paymentType: string;
}

@Injectable({
  providedIn: 'root',
})
export class PixService {
  url = 'http://localhost:8080/pix';

  constructor(private config: ConfigService, private hppCliente: HttpClient) {
    this.url = `${config.getHost()}/pix`;
  }

  gerarPix(
    pixDocType: string,
    docEntry: number | string,
    parcela: number | string
  ): Observable<PixGeradoItem[]> {
    return this.hppCliente.get<PixGeradoItem[]>(
      `${this.url}/gerar-chave/docType/${pixDocType}/docEntry/${docEntry}/parcela/${parcela}`
    );
  }

  checarPix(
    pixDocType: string,
    docEntry: number | string,
    parcela: number | string
  ): Observable<PixPagamentoStatus> {
    return this.hppCliente.get<PixPagamentoStatus>(
      `${this.url}/checar-chave/docType/${pixDocType}/docEntry/${docEntry}/parcela/${parcela}`
    );
  }

  
}
