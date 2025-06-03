import { HttpClient  } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { BatchStock } from '../_models/BatchStock.model';

@Injectable({
  providedIn: 'root'
})
export class BatchStockService {

    url = "http://localhost:8080/batch-stock"

    constructor(private config : ConfigService, private hppCliente : HttpClient) {
        this.url = config.getHost()+"/batch-stock"
    }

    get(itemCode: string, stock: string): Observable<Array<BatchStock>> {
        return this.hppCliente
            .get<Array<BatchStock>>(this.url + "/item-code/" + itemCode + "/stock/" + stock)
            .pipe(map((it) => {
                return it.map((ff) => Object.assign(new BatchStock(),ff) )
              }))
    }
}
