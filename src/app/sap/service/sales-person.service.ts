import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { ConfigService } from '../../core/services/config.service';
import { SalesPerson } from '../model/sales-person/sales-person';
import { Page } from '../model/page.model';
import { BusinessPartner } from '../model/business-partner/business-partner';

@Injectable({
  providedIn: 'root'
})
export class SalesPersonService {

  url = "http://localhost:8080/sales-person"
  private cachePorCodigo: { [code: number]: Observable<SalesPerson> } = {};
  
  constructor(private config : ConfigService, private httpClient : HttpClient) {
    this.url = config.getHost()+"/sales-person"
  }

  get(cardCode): Observable<SalesPerson> {
    const code = Number(cardCode);
    if(!Number.isFinite(code) || code < 0)
      return of(this.vendedorVazio(code));

    if(!this.cachePorCodigo[code]){
      this.cachePorCodigo[code] = this.httpClient
      .get<SalesPerson>(`${this.url}/${cardCode}`)
      .pipe(
        map((response) => Object.assign(new SalesPerson(), response)),
        catchError((error) => {
          delete this.cachePorCodigo[code];
          throw error;
        }),
        shareReplay(1)
      );
    }

    return this.cachePorCodigo[code];
  }

  replaceSalesPerson(origin: number, destination: number, selectedClientIds: number[]): Observable<boolean> {
    const params = new HttpParams().set('clientes', selectedClientIds.join(',')); 
  
    return this.httpClient
      .get<boolean>(`${this.url}/replace/${origin}/por/${destination}`, { params })
      .pipe(
        catchError((error: any) => {
          console.error('Erro ao executar a troca de vendedores:', error);
          throw error;
        })
      );
  }
  
  getBusinessPartners(salesEmployeeCode: number,page): Observable<Page<BusinessPartner>> {
    return this.httpClient
    .get<Page<BusinessPartner>>(`${this.url}/${salesEmployeeCode}/business-partners?page=` + page)
    .pipe(map((page) => {
     page.content = page.content.map((item) => Object.assign(new BusinessPartner(), item));
     return page;
   }));
 }
  
  search(keyWord): Observable<Page<SalesPerson>> {
    return this.httpClient
      .post<Page<SalesPerson>>(`${this.url}/search`, keyWord)
      .pipe(map((page) => {
        page.content = page.content.map((item) => {
          const vendedor = Object.assign(new SalesPerson(), item);
          this.cacheVendedor(vendedor);
          return vendedor;
        });
        return page;
      }));
  }

  save(idTransferenciaClientes: string): Observable<any> {
    return this.httpClient.get(`${this.url}/salvar/${idTransferenciaClientes}`);
  }

  private cacheVendedor(vendedor: SalesPerson) {
    const code = Number(vendedor?.SalesEmployeeCode);
    if(Number.isFinite(code) && code >= 0)
      this.cachePorCodigo[code] = of(vendedor).pipe(shareReplay(1));
  }

  private vendedorVazio(code: number): SalesPerson {
    return Object.assign(new SalesPerson(), {
      SalesEmployeeCode: Number.isFinite(code) ? code : -1,
      SalesEmployeeName: 'Nenhum vendedor',
    });
  }

}
