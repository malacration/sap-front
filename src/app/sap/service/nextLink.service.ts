import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root',
})
export class NextLinkService {
  url = 'http://localhost:8080/nextlink';

  constructor(private config: ConfigService, private hppCliente: HttpClient) {
    this.url = config.getHost() + '/nextlink';
  }

  next<T>(query: string): Observable<T> {
    return this.hppCliente.post<T>(this.url, query);
  }
}
