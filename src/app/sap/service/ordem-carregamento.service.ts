import { Injectable } from "@angular/core";
import { ConfigService } from "../../core/services/config.service";
import { HttpClient } from "@angular/common/http";
import { Page } from "../model/page.model";
import { Observable, map } from "rxjs";
import {LinhaItem, VendaFutura} from "../model/venda/venda-futura"
import { PedidoRetirada } from "../model/venda/pedido-retirada";
import { PedidoTroca } from "../model/venda/pedido-troca";
import { OrdemCarregamento } from "../model/ordem-carregamento";

@Injectable({
    providedIn: 'root'
  })
export class OrdemCarregamentoService{

    url = "http://localhost:8080/carregamento"

    constructor(private config : ConfigService, private http : HttpClient){
        this.url = config.getHost()+"/carregamento"
    }

    get(id : string): Observable<OrdemCarregamento> {
      let url = this.url+"/"+id
      return this.http.get<OrdemCarregamento>(url).pipe(
        map((venda) => {
          return this.vendaFuturaAssing(venda);
        })
      );
    }
    
    getAll(page, allVendedores : boolean = false): Observable<Page<OrdemCarregamento>> {
      let url = allVendedores ? this.url+"/all" : this.url
      url = url+"?page="+page
      return this.http.get<Page<OrdemCarregamento>>(url).pipe(
        map((page) => {
          page.content = page.content.map((venda) => {
            return this.vendaFuturaAssing(venda);
          });
          return page;
        })
      );
    }

    private vendaFuturaAssing(it) : OrdemCarregamento{
      const ordemCarregamento = Object.assign(new OrdemCarregamento(), it);
      ordemCarregamento.AR_CF_LINHACollection = ordemCarregamento.Ord_CRG_LINHACollection.map(item => 
        Object.assign(new LinhaItem(), item)
      );
      return ordemCarregamento
    }
}