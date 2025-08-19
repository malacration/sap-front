import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable, map, of } from "rxjs"
import { Produto } from "../models/produto"
import { ConfigService } from "../../../core/services/config.service"
import { LastPrice } from "../models/last-price"


@Injectable({
    providedIn: 'root'
  })
  export class CalculadoraService {
    // http://localhost:8080/back/calculadora-preco/itens/all?page=0&itemCodePrefix=PAC0000112&warehouse=500.01
    url = "http://localhost:8080/calculadora-preco"
    
    constructor(private config : ConfigService, private hppCliente : HttpClient) {
      this.url = config.getHost()+"/calculadora-preco"
    }
  
    range(start : string, end : string): Observable<Array<Produto>> {
      return this.hppCliente
        .get<Array<Produto>>(this.url + `/itens/all?itemCodeStart=${start}&itemCodeEnd=${end},page=0&warehouse=500.01`)
        .pipe(
          map((produtos) =>
            produtos.map((produto) => {
              const novoProduto = Object.assign(new Produto(), produto);
              if (Array.isArray(novoProduto.Ingredientes)) {
                novoProduto.Ingredientes = novoProduto.Ingredientes.map(
                  (ingrediente) => Object.assign(new Produto(), ingrediente)
                );
              }
              return novoProduto;
            })
          )
        );
    }

    getProdutosFromLocalStorage(key: string): Observable<Array<Produto>> {
      const storedData = localStorage.getItem(key);
      
      if (!storedData) {
        return of([]); // Retorna um array vazio se não houver dados
      }
    
      try {
        const produtos: Array<any> = JSON.parse(storedData); // Converte a string JSON em um array de objetos
        return of(produtos).pipe(
          map((produtos) =>
            produtos.map((produto) => {
              const novoProduto = Object.assign(new Produto(), produto);
    
              if (Array.isArray(novoProduto.Ingredientes)) {
                novoProduto.Ingredientes = novoProduto.Ingredientes.map(
                  (ingrediente) => Object.assign(new Produto(), ingrediente)
                );
              }
    
              return novoProduto;
            })
          )
        );
    
      } catch (error) {
        console.error('Erro ao parsear JSON do localStorage:', error);
        return of([]); // Em caso de erro no JSON, retorna um array vazio
      }
  }

  getLastPrice(itemCode, DefaultWareHouse) : Observable<Array<LastPrice>>{
    return this.hppCliente
      .get<Array<LastPrice>>(this.url+"/last-price/"+itemCode+"/"+DefaultWareHouse)
  }
}