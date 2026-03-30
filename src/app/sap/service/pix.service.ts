import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { Page } from '../model/page.model';

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

export interface PixAdiantamentoResponse {
  DueDate?: string | null;
  Total?: number | null;
  Status?: string | null;
  InstallmentId?: number | null;
  PaymentOrdered?: string | null;
  Percentage?: string | null;
  TotalFC?: number | null;
  U_QrCodePix?: string | null;
  U_pix_textContent?: string | null;
  U_pix_link?: string | null;
  U_pix_reference?: string | null;
  U_pix_due_date?: string | null;
  DocEntry?: number | null;
  TaxaJurosMoraPercent?: number | null;
  JurosValor?: number | null;
  ValorTitulo?: number | null;
  ValorTotal?: number | null;
  DocNum?: number | null;
  dueDate?: string | null;
  total?: number | null;
  status?: string | null;
  installmentId?: number | null;
  paymentOrdered?: string | null;
  percentage?: string | null;
  totalFC?: number | null;
  docEntry?: number | null;
  taxaJurosMoraPercent?: number | null;
  jurosValor?: number | null;
  valorTitulo?: number | null;
  valorTotal?: number | null;
  docNum?: number | null;
}

export interface PixPedidoRequest {
  cardCode: string;
  valor: number;
  idFilial: number;
  docEntry?: number;
  documentTypes?: string;
  ttlSeconds?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PixService {
  url = 'http://localhost:8080/pix';
  pedidoVendaUrl = 'http://localhost:8080/pedido-venda';

  constructor(private config: ConfigService, private hppCliente: HttpClient) {
    this.url = `${config.getHost()}/pix`;
    this.pedidoVendaUrl = `${config.getHost()}/pedido-venda`;
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

  listarAdiantamentosPedido(
    docEntry: number | string,
    page = 0,
    size = 20
  ): Observable<Page<PixAdiantamentoResponse>> {
    return this.hppCliente.get<Page<PixAdiantamentoResponse>>(
      `${this.pedidoVendaUrl}/pix/${docEntry}?page=${page}&size=${size}`
    );
  }

  consultarTransacao(reference: string): Observable<PixPagamentoStatus> {
    return this.hppCliente.get<PixPagamentoStatus>(`${this.url}/transaction/${reference}`);
  }

  checarPixAdiantamento(
    docEntry: number | string,
    parcela: number | string
  ): Observable<PixPagamentoStatus> {
    return this.hppCliente.get<PixPagamentoStatus>(
      `${this.url}/checar-chave/docType/oDownPayments/docEntry/${docEntry}/parcela/${parcela}`
    );
  }

  gerarPixPedido(request: PixPedidoRequest): Observable<PixGeradoItem> {
    return this.hppCliente.post<PixGeradoItem>(`${this.url}/gerar-chave`, request);
  }
}
