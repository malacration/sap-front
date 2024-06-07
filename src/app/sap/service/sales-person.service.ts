import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { SalesPerson } from '../model/sales-person/sales-person';
import { Page } from '../model/page.model';
import { SearchService } from './search.service';

@Injectable({
  providedIn: 'root'
})
export class SalesPersonService implements SearchService<SalesPerson> {

  url = "http://localhost:8080/sales-person"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/sales-person"
  }

  get(cardCode){
    return this.hppCliente
      .get<SalesPerson>(this.url+"/"+cardCode)
      .pipe(map((pn) => Object.assign(new SalesPerson(),pn)))
  }

  search(keyWord) : Observable<Page<SalesPerson>>{
    return this.hppCliente
      .post<Page<SalesPerson>>(this.url+"/search",keyWord)
      .pipe(map((page) => {
        page.content = page.content.map((ff) => Object.assign(new SalesPerson(),ff) )
        return page
      }))
  }
}
