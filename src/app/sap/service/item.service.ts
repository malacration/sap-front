import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { Page } from '../model/page.model';
import { Item } from '../model/item';

@Injectable({
  providedIn: 'root',
})
export class ItemService {
  url = 'http://localhost:8080/item';

  constructor(private config: ConfigService, private hppCliente: HttpClient) {
    this.url = config.getHost() + '/item';
  }

  search(keyWord, branchId): Observable<Page<Item>> {
    return this.hppCliente
      .post<Page<Item>>(this.url + '/search/branch/' + branchId, keyWord)
      .pipe(
        map((page) => {
          page.content = page.content.map((ff) =>
            Object.assign(new Item(), ff)
          );
          return page;
        })
      );
  }

  searchItem(keyWord: string): Observable<Page<Item>> {
    return this.hppCliente
      .post<Page<Item>>(this.url + '/search', keyWord, { responseType: 'json' })
      .pipe(
        map((page) => {
          page.content = page.content.map((ff) =>
            Object.assign(new Item(), ff)
          );
          return page;
        })
      );
  }
}
