import { Injectable } from "@angular/core";
import { ConfigService } from "../../core/services/config.service";
import { HttpClient } from "@angular/common/http";
import { Page } from "../model/page.model";
import { Observable, map } from "rxjs";
import {LinhaItem, VendaFutura} from "../model/venda-futura"

@Injectable({
    providedIn: 'root'
  })
export class VendaFuturaService{

    url = "http://localhost:8080/contrato-venda-futura"

    constructor(private config : ConfigService, private http : HttpClient){
        this.url = config.getHost()+"/contrato-venda-futura"
    }
    
    get($event): Observable<Page<VendaFutura>> {
      return this.http.get<Page<VendaFutura>>(this.url).pipe(
        map((page) => {
          page.content = page.content.map((ff) => {
            const vendaFutura = Object.assign(new VendaFutura(), ff);
            vendaFutura.AR_CF_LINHACollection = vendaFutura.AR_CF_LINHACollection.map(item => 
              Object.assign(new LinhaItem(), item)
            );
            return vendaFutura;
          });
          return page;
        })
      );
    }

}