import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Paga } from '../../model/fatura/paga.model';

@Injectable({
  providedIn: 'root'
})
export class InstallmentService {

    url = "http://localhost:8080/installment"

    constructor(private config : ConfigService, private hppCliente : HttpClient) {
        this.url = config.getHost()+"/installment"
    }

    getFaturaPaga(docEntry : string) : Observable<Array<Paga>>{
        return this.hppCliente
            .get<any>(this.url+"/"+docEntry+"/paid")
    }
}
