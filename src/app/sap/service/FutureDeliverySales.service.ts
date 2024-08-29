import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { FutureDeliverySales } from '../model/markting/future-delivery-sales';

@Injectable({
  providedIn: 'root'
})
export class FutureDeliverySalesService {

  url = "http://localhost:8080/future-sales"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
      this.url = config.getHost()+"/future-sales"
  }

  getByNotaFiscalSaida(docEntry: number): Observable<Array<FutureDeliverySales>> {
    return this.hppCliente.get<Array<FutureDeliverySales>>(this.url + "/contrato-venda-futura/", { params: { docEntry } });
  }
}