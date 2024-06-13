import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConfigService } from '../../core/services/config.service';
import { SalesPerson } from '../model/sales-person/sales-person';
import { Page } from '../model/page.model';

@Injectable({
  providedIn: 'root'
})
export class SalesPersonService {

  url = "http://localhost:8080/sales-person"
  
  constructor(private config : ConfigService, private httpClient : HttpClient) {
    this.url = config.getHost()+"/sales-person"
  }

  get(cardCode): Observable<SalesPerson> {
    return this.httpClient
      .get<SalesPerson>(`${this.url}/${cardCode}`)
      .pipe(map((response) => Object.assign(new SalesPerson(), response)));
  }

  replaceSalesPerson(origin: number, destination: number): Observable<boolean> {
    return this.httpClient
      .get<boolean>(`${this.url}/replace/${origin}/por/${destination}`)
      .pipe(
        catchError((error: any) => {
          console.error('Erro ao executar a troca de vendedores:', error);
          throw error;
        })
      );
  }
  
  search(keyWord): Observable<Page<SalesPerson>> {
    return this.httpClient
      .post<Page<SalesPerson>>(`${this.url}/search`, keyWord)
      .pipe(map((page) => {
        page.content = page.content.map((item) => Object.assign(new SalesPerson(), item));
        return page;
      }));
  }

  save(idGestaoVendedores: string): Observable<any> {
    return this.httpClient.get(`${this.url}/salvar/${idGestaoVendedores}`);
  }

}
