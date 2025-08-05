import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../core/services/config.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvoiceGenerationService {
  private url = "http://localhost:8080/invoice";

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + "/invoice";
  }

  generateInvoiceFromLoadingOrder(docEntry: number): Observable<any> {
      // Enviar apenas o DocEntry do pedido como parâmetro
      return this.http.post(`${this.url}/generate-from-loading-order/${docEntry}`, {});
    }
}