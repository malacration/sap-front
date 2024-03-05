import { HttpClient, HttpParams  } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Fatura } from '../../model/fatura/fatura.model';
import { Page } from '../../model/page.model';
import { Parcela } from '../../model/fatura/parcela.model';

@Injectable({
  providedIn: 'root'
})
export class FaturasService {

    url = "http://localhost:8080/invoice"

    constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/invoice"
    }

    getFaturas(cardCode : string, page = 0, filter : any = undefined) : Observable<Page<Fatura>>{
        console.log(filter)
        filter = Object.fromEntries(Object.entries(filter).filter(([_, v]) => v != null && v != ''))
        console.log(filter)
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
}
