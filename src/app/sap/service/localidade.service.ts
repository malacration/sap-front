import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { Page } from '../model/page.model';
import { SearchService } from './search.service';
import { Localidade } from '../model/localidade/localidade';

@Injectable({
  providedIn: 'root'
})
export class LocalidadeService implements SearchService<Localidade> {

  url = "http://localhost:8080/locais"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/locais"
  }

  get(cardCode) : Observable<Localidade>{
    return this.hppCliente
      .get<Localidade>(this.url+"/"+cardCode)
      .pipe(map((pn) => Object.assign(new Localidade(),pn)))
  }

  search(keyWord) : Observable<Page<Localidade>>{
    return this.hppCliente
      .post<Page<Localidade>>(this.url+"/search",keyWord)
      .pipe(map((page) => {
        page.content = page.content.map((ff) => Object.assign(new Localidade(),ff) )
        return page
      }))
  }
}