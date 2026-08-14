import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { SearchService } from '../../../sap/service/search.service';
import { Localidade } from '../../../sap/model/localidade/localidade';
import { Page } from '../../../sap/model/page.model';

@Injectable({
  providedIn: 'root'
})
export class LocalidadeService implements SearchService<Localidade> {

  url = "http://localhost:8080/locais"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/locais"
  }

  private toLocalidade(it : any) : Localidade {
    return Object.assign(new Localidade(), it)
  }

  get(cardCode) : Observable<Localidade>{
    return this.hppCliente
      .get<Localidade>(this.url+"/"+cardCode)
      .pipe(map((pn) => this.toLocalidade(pn)))
  }

  criar(localidade : Partial<Localidade>) : Observable<Localidade>{
    return this.hppCliente
      .post<Localidade>(this.url, localidade)
      .pipe(map((it) => this.toLocalidade(it)))
  }

  search(keyWord) : Observable<Page<Localidade>>{
    return this.hppCliente
      .post<Page<Localidade>>(this.url+"/search",keyWord)
      .pipe(map((page) => {
        page.content = page.content.map((ff) => this.toLocalidade(ff) )
        return page
      }))
  }
}
