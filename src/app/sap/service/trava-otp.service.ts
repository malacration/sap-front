import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

export interface TravaOtpResponse {
  regra: string;
  codigo: string;
  expiraEmSegundos: number;
}

/**
 * Solicita ao sap-service o codigo de liberacao (OTP) das travas da
 * TransactionNotification. O segredo NAO fica no front: quem calcula e o
 * backend (TravaOtpController), que restringe por papel (rules.yml:
 * liberacao_trava / admin). Em producao, quem nao tem o papel recebe 403.
 */
@Injectable({
  providedIn: 'root'
})
export class TravaOtpService {

  url = 'http://localhost:8080/trava';

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + '/trava';
  }

  gerar(regra: string): Observable<TravaOtpResponse> {
    return this.http.get<TravaOtpResponse>(this.url + '/otp?regra=' + encodeURIComponent(regra));
  }
}
