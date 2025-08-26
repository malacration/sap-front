import { Injectable } from "@angular/core";
import { ConfigService } from "../../core/services/config.service";
import { HttpClient } from "@angular/common/http";
import { Page } from "../model/page.model";
import { Observable, map } from "rxjs";
import { PedidoRetirada } from "../model/venda/pedido-retirada";
import { PedidoTroca } from "../model/venda/pedido-troca";
import { OrdemCarregamento } from "../model/ordem-carregamento";
import { LinhaItem } from "../model/venda/venda-futura";
import { BatchStock } from "../../modulos/sap-shared/_models/BatchStock.model";

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
      ordemCarregamento.Ord_CRG_LINHACollection = (it.ORD_CRG_LINHACollection || []).map(item => 
        Object.assign(new LinhaItem(), {
          DocEntry: item.docEntry,
          LineId: item.LineId,
          U_orderDocEntry: item.u_orderDocEntry,
          U_docNumPedido: item.u_docNumPedido,
          U_cardCode: item.u_cardCode,
          U_cardName: item.u_cardName,
          U_quantidade: item.u_quantidade,
          U_pesoItem: item.u_pesoItem
        })
      );
      return ordemCarregamento;
    }

    save(body : OrdemCarregamento) : Observable<any>{
    return this.http.post<any>(this.url+"/angular",body)
    }

    cancelarPedidos(docEntryOrdem: number, docNumsPedidos: number[]): Observable<any> {
      const url = `${this.url}/${docEntryOrdem}/cancelar-pedidos`;
      return this.http.post(url, { pedidos: docNumsPedidos });
    }

    finalizar(id: number): Observable<any> {
    const url = `${this.url}/${id}/finalizar`;
    return this.http.post(url, {});
    }

    getEstoqueEmCarregamento(itemCode: string): Observable<number> {
      return this.http.get<number>(`${this.url}/estoque-em-carregamento?ItemCode=${itemCode}`);
    }

  saveSelectedLotes(docEntry: number, lote: any): Observable<any> {
      const url = `${this.url}/generate-from-loading-order/${docEntry}`;
      return this.http.post(url, lote);
  }
}
