import { HttpClient, HttpParams  } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Fatura } from '../../model/fatura/fatura.model';
import { Page } from '../../model/page.model';
import { Parcela } from '../../model/fatura/parcela.model';
import { NextLink } from '../../model/next-link';
import { PedidoVenda } from '../../components/document/documento.statement.component';

@Injectable({
  providedIn: 'root'
})
export class FaturasService {

    url = "http://localhost:8080/invoice"

    constructor(private config : ConfigService, private hppCliente : HttpClient) {
        this.url = config.getHost()+"/invoice"
    }

    getFaturas(cardCode : string, page = 0, filter : any = undefined) : Observable<Page<Fatura>>{
        filter = Object.fromEntries(Object.entries(filter).filter(([_, v]) => v != null && v != ''))
        return this.hppCliente
            .get<Page<Fatura>>(this.url+"/cardcode/"+cardCode+"/payment?page="+page+"&size=10",{
                params : filter
            })
            .pipe(map((f) => { 
                f.content = f.content.map((ff) => {
                    let ass = Object.assign(new Fatura(),ff)
                    ass.parcelas = ass.parcelas.map(p => Object.assign(new Parcela(),p))
                    return ass
                })
                return f
            }))
    }

    getPdf(docEntry : string, parcela : string) : Observable<Blob>{
        return this.hppCliente
            .get<Blob>(
                this.url+"/"+docEntry+"/parcela/"+parcela,
                { observe: 'body', responseType: 'blob' as 'json' }
            )
    }

    getPedidos(dataInicial: string, dataFinal: string, filial: string, localidade: number): Observable<NextLink<PedidoVenda>> {
      let params = new HttpParams()
        .set('filial', filial.toString())
        .set('localidade', localidade.toString());
  
      if (dataInicial) {
        params = params.set('dataInicial', dataInicial);
      }
  
      if (dataFinal) {
        params = params.set('dataFinal', dataFinal);
      }
  
      return this.hppCliente
        .get<NextLink<PedidoVenda>>(`${this.url}/search`, { params })
        .pipe(
          map((response) => {
            response.content = response.content.map((item) => Object.assign(new PedidoVenda(), item));
            return response
          })
        );
    }

      search(keyWord) : Observable<Page<PedidoVenda>>{
        return this.hppCliente
          .post<Page<PedidoVenda>>(this.url+"/searchAll",keyWord)
          .pipe(map((page) => {
            page.content = page.content.map((ff) => Object.assign(new PedidoVenda(),ff) )
            return page
          }))
      }
}
