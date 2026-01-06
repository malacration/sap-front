import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { BatchStock } from '../_models/BatchStock.model';

@Injectable()
export class BatchStockService {

  private readonly url: string;

  constructor(private config: ConfigService, private httpClient: HttpClient) {
    this.url = `${this.config.getHost()}/batch-stock`;
  }

  get(itemCode: string, stock: string): Observable<Array<BatchStock>> {
    return this.httpClient
      .get<Array<BatchStock>>(`${this.url}/item-code/${itemCode}/stock/${stock}`)
      .pipe(
        map((it) => it.map((batch) => Object.assign(new BatchStock(), batch)))
      );
  }
}
