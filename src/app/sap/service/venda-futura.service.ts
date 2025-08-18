import { Injectable } from "@angular/core";
import { ConfigService } from "../../core/services/config.service";
import { HttpClient } from "@angular/common/http";
import { Page } from "../model/page.model";
import { Observable, map } from "rxjs";
import {LinhaItem, VendaFutura} from "../model/venda/venda-futura"
import { PedidoRetirada } from "../model/venda/pedido-retirada";
import { PedidoTroca } from "../model/venda/pedido-troca";
import { FutureDeliverySales } from "../model/markting/future-delivery-sales";

@Injectable({
    providedIn: 'root'
  })
export class VendaFuturaService{

    url = "http://localhost:8080/contrato-venda-futura"

    constructor(private config : ConfigService, private http : HttpClient){
        this.url = config.getHost()+"/contrato-venda-futura"
    }

    get(id : string): Observable<VendaFutura> {
      let url = this.url+"/"+id
      return this.http.get<VendaFutura>(url).pipe(
        map((venda) => {
          return this.vendaFuturaAssing(venda);
        })
      );
    }
    
    getAll(page, allVendedores : boolean = false): Observable<Page<VendaFutura>> {
      let url = allVendedores ? this.url+"/all" : this.url
      url = url+"?page="+page
      return this.http.get<Page<VendaFutura>>(url).pipe(
        map((page) => {
          page.content = page.content.map((venda) => {
            return this.vendaFuturaAssing(venda);
          });
          return page;
        })
      );
    }

    getEntregas(docEntry: number): Observable<Array<FutureDeliverySales>> {
      return this.http.get<Array<FutureDeliverySales>>(this.url + "/entregas/"+docEntry)
        .pipe(
          map((it) => {
            return it.map(i => Object.assign(new FutureDeliverySales(), i));
          })
        );
    }

    cancelarConciliacao(docEntry) : Observable<string>{
      let url = this.url+"/devolver/"+docEntry
      return this.http.get<string>(url)
    }


    encerrarContrato(docEntry) : Observable<string>{
      let url = this.url+"/encerrar/"+docEntry
      return this.http.get<string>(url)
    }

    private vendaFuturaAssing(it) : VendaFutura{
      const vendaFutura = Object.assign(new VendaFutura(), it);
      vendaFutura.AR_CF_LINHACollection = vendaFutura.AR_CF_LINHACollection.map(item => 
        Object.assign(new LinhaItem(), item)
      );
      return vendaFutura
    }

    trocar(pedido : PedidoTroca) : Observable<any> {
      return this.http.post<any>(this.url+"/troca",pedido)
    }

    retirar(body : PedidoRetirada) : Observable<any>{
      return this.http.post<any>(this.url+"/pedido-retirada",body)
    }

    emitirBoletos(docEntry : number){
      return this.http.get<any>(this.url+"/emitir-boletos/"+docEntry)
    }

}