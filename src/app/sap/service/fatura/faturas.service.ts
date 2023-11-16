import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Fatura } from '../../model/fatura/fatura.model';

@Injectable({
  providedIn: 'root'
})
export class FaturasService {

    url = "http://localhost:8080/windson"

    constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/windson"
    }

    getFaturas() : Observable<any>{
        let f1 = new Fatura("1","1",500,5,"55","5052")
        let f2 = new Fatura("2","1",500,5,"55","5052")
        let faturas = [
            f1,
            f2
        ]
        return of(faturas)

    }
}
