import { Injectable } from "@angular/core"
import { HttpClient, HttpParams } from "@angular/common/http"
import { Observable, map } from "rxjs"
import { ConfigService } from "../../../core/services/config.service"
import { Page } from "../../../sap/model/page.model"
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
}
