import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { BusinessPartner } from '../../../sap/model/business-partner/business-partner';
import { Page } from '../../../sap/model/page.model';
import { SearchService } from '../../../sap/service/search.service';
import { LinhasPedido, PedidoVenda } from '../../../sap/model/document/pedido-venda.model';
import { ContaReceber } from '../../../sap/model/contas-receber.model';

@Injectable({
  providedIn: 'root'
})
export class BusinessPartnerService implements SearchService<BusinessPartner> {

  url = "http://localhost:8080/business-partners"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/business-partners"
  }

  get(cardCode) : Observable<BusinessPartner>{
    return this.hppCliente
      .get<BusinessPartner>(this.url+"/"+cardCode)
      .pipe(map((pn) => Object.assign(new BusinessPartner(),pn)))
  }

  getByUpdate(hashCode : string) : Observable<BusinessPartner>{
    return this.hppCliente
      .get<BusinessPartner>(this.url+"/key/"+hashCode)
      .pipe(map((pn) => Object.assign(new BusinessPartner(),pn)))
  }

  attachment(hashCode : string, file : any) : Observable<BusinessPartner> {
    let formData = new FormData();
        formData.append('file', file, file.name);
    return this.hppCliente.post<BusinessPartner>(this.url+"/key/"+hashCode+'/attachment',formData)
  }


  save(hashCode : string, pn : BusinessPartner) : Observable<BusinessPartner> {
    return this.hppCliente.post<BusinessPartner>(this.url+"/key/"+hashCode,pn)
  }

  setLocalidadeEndereco(cardCode : string, addressName : string, localidade : number) : Observable<BusinessPartner>{
    const params = localidade ? { localidade : localidade } : {}
    return this.hppCliente
      .put<BusinessPartner>(`${this.url}/${cardCode}/enderecos/${encodeURIComponent(addressName)}/localidade`, {}, { params })
      .pipe(map((pn) => Object.assign(new BusinessPartner(),pn)))
  }

  getByCurrentUser() : Observable<BusinessPartner>{
    return this.hppCliente
      .get<BusinessPartner>(this.url+"/cpf-cnpj")
      .pipe(map((pn) => Object.assign(new BusinessPartner(),pn)))
  }

  getContactsOpaco(cpfCnpj : string) : Observable<Array<any>>{
    cpfCnpj = cpfCnpj.replace(/\D/g, '');
    return this.hppCliente
      .get<Array<any>>(this.url+"/cpf-cnpj/contact/"+cpfCnpj)
  }

  selectOTPContat(cpfCnpj : string, otp : string) : Observable<Array<any>>{
    cpfCnpj = cpfCnpj.replace(/\D/g, '');
    return this.hppCliente
      .get<Array<any>>(this.url+"/cpf-cnpj/"+cpfCnpj+"/otp?otp="+otp)
  }

  search(keyWord) : Observable<Page<BusinessPartner>>{
    return this.hppCliente
      .post<Page<BusinessPartner>>(this.url+"/search",keyWord)
      .pipe(map((page) => {
        page.content = page.content.map((ff) => Object.assign(new BusinessPartner(),ff) )
        return page
      }))
  }

  getClientes(page: number, filter: any = undefined): Observable<Page<BusinessPartner>> {
    filter = Object.fromEntries(Object.entries(filter || {}).filter(([_, v]) => v != null && v !== ''));
    return this.hppCliente.get<Page<BusinessPartner>>(this.url + "/cientes", { params: { ...filter, page } }).pipe(
      map((page) => {
        page.content = page.content.map((ff) => {
          const parceiroNegocio = Object.assign(new BusinessPartner(), ff);
          return parceiroNegocio;
        });
        return page;
      })
    );
  }

  getPedidodeVendaBP(CardCode: string, page = 0, filter: any = undefined): Observable<Page<PedidoVenda>> {
    filter = Object.fromEntries(Object.entries(filter || {}).filter(([_, v]) => v != null && v !== ''));
    return this.hppCliente
      .get<Page<PedidoVenda>>(this.url + "/pedido-venda-parceiro", { params: { CardCode, page, size: 10, ...filter } })
      .pipe(map((page) => {
        page.content = page.content.map((it) => this.toPedidoVenda(it));
        return page;
      }));
  }

  getCotacoesBP(CardCode: string, page = 0, filter: any = undefined): Observable<Page<PedidoVenda>> {
    filter = Object.fromEntries(Object.entries(filter || {}).filter(([_, v]) => v != null && v !== ''));
    return this.hppCliente
      .get<Page<PedidoVenda>>(this.url + "/cotacoes-parceiro", { params: { CardCode, page, size: 10, ...filter } })
      .pipe(map((page) => {
        page.content = page.content.map((it) => this.toPedidoVenda(it));
        return page;
      }));
  }

  getContasReceberBP(CardCode: string): Observable<Page<ContaReceber>> {
    return this.hppCliente.get<Page<ContaReceber>>(this.url + "/contas-receber", { params: { CardCode } });
  }
  getContasReceberNextLink(nextLink: string): Observable<Page<ContaReceber>> {
    const url = this.url + '/contas-receber/nextlink';
    return this.hppCliente.post<Page<ContaReceber>>(url, nextLink);
}

  private toPedidoVenda(it: any): PedidoVenda {
    const pedido = Object.assign(new PedidoVenda(), it);
    pedido.DocumentLines = (pedido.DocumentLines || []).map((linha) => {
      const item = Object.assign(new LinhasPedido(), linha);
      item.ItemDescription = item.ItemDescription || linha.Dscription || linha.dscription;
      return item;
    });
    return pedido;
  }
  
}
