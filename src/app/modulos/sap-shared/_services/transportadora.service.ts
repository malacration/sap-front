import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { BusinessPartner } from '../../../sap/model/business-partner/business-partner';
import { Page } from '../../../sap/model/page.model';
import { SearchService } from '../../../sap/service/search.service';

/**
 * Busca de transportadora igual a lista de PN do SAP: fornecedores (CardType S), sem o recorte
 * da carteira do vendedor que a busca de cliente aplica.
 *
 * shortcut: usa search-vendedor, que devolve so a 1a pagina do Service Layer (20 linhas) e nao
 * tem nextLink; se faltar transportadora na lista, criar endpoint paginado.
 */
@Injectable({
  providedIn: 'root'
})
export class TransportadoraService implements SearchService<BusinessPartner> {

  private url : string

  constructor(config : ConfigService, private http : HttpClient) {
    this.url = config.getHost() + "/business-partners/search-vendedor"
  }

  search(keyWord : string) : Observable<Page<BusinessPartner>> {
    return this.http
      .get<Array<BusinessPartner>>(this.url, { params: { search: keyWord } })
      .pipe(map(values => {
        const page = new Page<BusinessPartner>()
        page.content = values.map(value => Object.assign(new BusinessPartner(), value))
        page.totalElements = page.content.length
        page.size = page.content.length
        page.nextLink = ''
        return page
      }))
  }
}
