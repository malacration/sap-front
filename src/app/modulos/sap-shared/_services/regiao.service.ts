import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Regiao } from '../../../sap/model/regiao/regiao';
import { Page } from '../../../sap/model/page.model';

@Injectable({
  providedIn: 'root'
})
export class RegiaoService {

  url = "http://localhost:8080/regioes"

  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/regioes"
  }

  private toRegiao(it : any) : Regiao {
    return Object.assign(new Regiao(), it)
  }

  getPage(page : number, search : string = null, ativa : boolean = null, filial : number = null) : Observable<Page<Regiao>>{
    const params : any = { page }
    if(search && search.trim() != '')
      params.search = search.trim()
    if(ativa != null)
      params.ativa = ativa
    if(filial != null)
      params.filial = filial
    return this.hppCliente
      .get<Page<Regiao>>(this.url, { params })
      .pipe(map(pagina => {
        pagina.content = (pagina.content || []).map(it => this.toRegiao(it))
        return pagina
      }))
  }

  getTodas(search : string = null) : Observable<Array<Regiao>>{
    const params : any = search && search.trim() != '' ? { search : search.trim() } : {}
    return this.hppCliente
      .get<Array<Regiao>>(this.url+"/todas", { params })
      .pipe(map(it => (it || []).map(r => this.toRegiao(r))))
  }

  criar(regiao : Partial<Regiao>) : Observable<Regiao>{
    return this.hppCliente
      .post<Regiao>(this.url, regiao)
      .pipe(map(it => this.toRegiao(it)))
  }

  get(code : string) : Observable<Regiao>{
    return this.hppCliente
      .get<Regiao>(this.url+"/"+code)
      .pipe(map(it => this.toRegiao(it)))
  }

  getByLocalidade(codLocalidade : string) : Observable<Array<Regiao>>{
    return this.hppCliente
      .get<Array<Regiao>>(this.url+"/localidade/"+codLocalidade)
      .pipe(map(it => (it || []).map(r => this.toRegiao(r))))
  }

  atualizaFilial(code : string, filial : number) : Observable<Regiao>{
    const params : any = filial != null ? { filial } : {}
    return this.hppCliente
      .put<Regiao>(this.url+"/"+code+"/filial", {}, { params })
      .pipe(map(it => this.toRegiao(it)))
  }

  ativar(code : string) : Observable<Regiao>{
    return this.hppCliente
      .put<Regiao>(this.url+"/"+code+"/ativar", {})
      .pipe(map(it => this.toRegiao(it)))
  }

  desativar(code : string) : Observable<Regiao>{
    return this.hppCliente
      .put<Regiao>(this.url+"/"+code+"/desativar", {})
      .pipe(map(it => this.toRegiao(it)))
  }

  substituir(code : string, novoCode : string) : Observable<Regiao>{
    return this.hppCliente
      .put<Regiao>(this.url+"/"+code+"/substituir/"+novoCode, {})
      .pipe(map(it => this.toRegiao(it)))
  }

  addLocalidade(code : string, codLocalidade : string, distanciaKm : number) : Observable<Regiao>{
    return this.hppCliente
      .post<Regiao>(this.url+"/"+code+"/localidades/"+codLocalidade, {}, { params : { distancia : distanciaKm } })
      .pipe(map(it => this.toRegiao(it)))
  }

  removeLocalidade(code : string, codLocalidade : string) : Observable<Regiao>{
    return this.hppCliente
      .delete<Regiao>(this.url+"/"+code+"/localidades/"+codLocalidade)
      .pipe(map(it => this.toRegiao(it)))
  }

  atualizaDistancia(code : string, codLocalidade : string, distanciaKm : number) : Observable<Regiao>{
    return this.hppCliente
      .put<Regiao>(this.url+"/"+code+"/localidades/"+codLocalidade+"/distancia", {}, { params : { distancia : distanciaKm } })
      .pipe(map(it => this.toRegiao(it)))
  }

  addFaixa(code : string, qtdeMinima : number, valorKm : number) : Observable<Regiao>{
    return this.hppCliente
      .post<Regiao>(this.url+"/"+code+"/faixas", {}, { params : { qtdeMinima, valorKm } })
      .pipe(map(it => this.toRegiao(it)))
  }

  atualizaFaixa(code : string, lineId : number, qtdeMinima : number, valorKm : number) : Observable<Regiao>{
    return this.hppCliente
      .put<Regiao>(this.url+"/"+code+"/faixas/"+lineId, {}, { params : { qtdeMinima, valorKm } })
      .pipe(map(it => this.toRegiao(it)))
  }

  removeFaixa(code : string, lineId : number) : Observable<Regiao>{
    return this.hppCliente
      .delete<Regiao>(this.url+"/"+code+"/faixas/"+lineId)
      .pipe(map(it => this.toRegiao(it)))
  }

  update(code : string, regiao : Partial<Regiao>) : Observable<Regiao>{
    return this.hppCliente
      .patch<Regiao>(this.url+"/"+code, regiao)
      .pipe(map(it => this.toRegiao(it)))
  }
}
