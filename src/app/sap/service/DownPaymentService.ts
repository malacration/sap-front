import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

export interface BoletoVf {
  DocEntry: number;
  DocNum: string;
  DocDueDate: string;
  DocTotal: string;
  DocStatus: 'O' | 'C';
  InstallmentId: number;
  U_QrCodePix?: string;
  U_pix_textContent?: string;
  U_pix_link?: string;
  U_pix_reference?: string;
  U_pix_due_date?: string;
  U_pix_proxima_consulta_em?: string;
  U_pix_consultar_ate?: string;
  Devolucao?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DownPaymentService {

  url = 'http://localhost:8080/down-payment';

  constructor(private config: ConfigService, private hppCliente: HttpClient) {
    this.url = config.getHost() + '/down-payment';
  }

  getByContrato(id: number): Observable<BoletoVf[]> {
    return this.hppCliente.get<BoletoVf[]>(`${this.url}/contrato-venda-futura/${id}`);
  }

  gerarPixContrato(contratoId: number): Observable<BoletoVf[]> {
    return this.hppCliente.post<BoletoVf[]>(
      `${this.url}/contrato-venda-futura/${contratoId}/pix`,
      {}
    );
  }
}
