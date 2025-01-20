import { Injectable } from "@angular/core"
import { ConfigService } from "../../core/services/config.service"
import { HttpClient } from "@angular/common/http"
import { Observable, map, of } from "rxjs"
import { Page } from "../../sap/model/page.model"
import { Produto } from "../models/produto"


@Injectable({
    providedIn: 'root'
  })
  export class teste{
    // http://localhost:8080/back/calculadora-preco/itens/all?page=0&itemCodePrefix=PAC0000112&warehouse=500.01
    url = "http://localhost:8080/calculadora-preco"
    
    constructor(private config : ConfigService, private hppCliente : HttpClient) {
      this.url = config.getHost()+"/calculadora-preco"
    }
  
    range() : Observable<Array<Produto>>{
      //TODO modificar depositom padrao
      return this.hppCliente
        .get<Array<Produto>>(this.url+"/itens/all?page=0&warehouse=500.01")
        .pipe(map((it) => it.map((ff) => Object.assign(new Produto(),ff) )))
    }
  }