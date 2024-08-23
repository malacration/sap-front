import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { DownPayment } from '../model/markting/down-payment';

@Injectable({
  providedIn: 'root'
})
export class DownPaymentService {

  url = "http://localhost:8080/down-payment"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
      this.url = config.getHost()+"/down-payment"
  }

  getByContrato(id : number) : Observable<Array<DownPayment>> {
    return this.hppCliente.get<Array<DownPayment>>(this.url+"/contrato-venda-futura/"+id)
      .pipe(map((it) => {
        it = it.map( i => Object.assign(new DownPayment(),i))
        return it
      }))
  }
}