import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
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

    getFaturas(cardCode : string, page = 0) : Observable<Page<Fatura>>{
        return this.hppCliente
            .get<Page<Fatura>>(this.url+"/cardcode/"+cardCode+"/payment?page="+page+"&size=10")
            .pipe(map((f) => { 
                f.content = f.content.map((ff) => {
                    let ass = Object.assign(new Fatura(),ff)
                    ass.parcelas = ass.parcelas.map(p => Object.assign(new Parcela(),p))
                    return ass
                })
                return f
            }))
    }
}
