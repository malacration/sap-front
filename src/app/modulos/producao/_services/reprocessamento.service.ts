import { ChangeDetectorRef, Injectable } from "@angular/core"
import { ConfigService } from "../../../core/services/config.service"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { Reprocessamento } from "../_model/reprocessamento"



@Injectable({
    providedIn: 'root'
  })
export class ReprocessamentoService {

    private url = "http://localhost:8080/reprocessamento"

    constructor(
        private config : ConfigService, 
        private hppCliente : HttpClient) {

        this.url = config.getHost()+"/reprocessamento"
    }

    

    reprocesar(reprocessamento : Reprocessamento) : Observable<any>{
        return this.hppCliente.post(
                this.url,
                reprocessamento
            )
    }
}