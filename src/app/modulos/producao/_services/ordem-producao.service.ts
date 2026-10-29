import { Injectable } from "@angular/core"
import { HttpClient, HttpParams } from "@angular/common/http"
import { Observable, map } from "rxjs"
import { ConfigService } from "../../../core/services/config.service"
import { Page } from "../../../sap/model/page.model"
import { MapaRelacoesResponse } from "../../../sap/model/mapa-relacoes"
import { OrdemProducao } from "../_model/ordem-producao"

@Injectable({
    providedIn: 'root'
})
export class OrdemProducaoService {

    private url : string

    constructor(config : ConfigService, private http : HttpClient) {
        this.url = config.getHost()+"/ordens-producao"
    }

    // status vazio = todos; varios status repetem o parametro (?status=A&status=B).
    listar(page : number, status : Array<string> = []) : Observable<Page<OrdemProducao>> {
        let params = new HttpParams().set('page', page.toString())
        status.forEach(it => params = params.append('status', it))
        return this.http.get<Page<any>>(this.url, { params }).pipe(
            map(pagina => ({ ...pagina, content: (pagina.content ?? []).map(OrdemProducao.from) }))
        )
    }

    // Ordem com as linhas (materias-primas) e o numero de bateladas.
    detalhe(absoluteEntry : number) : Observable<OrdemProducao> {
        return this.http.get<any>(`${this.url}/${absoluteEntry}`).pipe(map(OrdemProducao.from))
    }

    // Um nivel do rastreio: o lote, a OP que o gerou e os lotes que ela consumiu. item vai no clique de um
    // lote do mapa (o numero do lote so e unico junto do item); na busca digitada fica de fora.
    rastreioLote(lote : string, item? : string) : Observable<MapaRelacoesResponse> {
        let params = new HttpParams().set('lote', lote)
        if(item)
            params = params.set('item', item)
        return this.http.get<MapaRelacoesResponse>(`${this.url}/rastreio-lote`, { params })
    }

    // Destino do lote: OPs que o consumiram, lotes que elas geraram e as vendas com o cliente.
    rastreioDestino(lote : string, item : string) : Observable<MapaRelacoesResponse> {
        const params = new HttpParams().set('lote', lote).set('item', item)
        return this.http.get<MapaRelacoesResponse>(`${this.url}/rastreio-lote/destino`, { params })
    }
}
