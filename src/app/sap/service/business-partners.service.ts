import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';
import { BusinessPartner } from '../model/business-partner/business-partner';
import { Page } from '../model/page.model';
import { SearchService } from './search.service';
import { OrderSales } from '../components/document/documento.statement.component';

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

  getParceiro(page: number): Observable<Page<BusinessPartner>> {
    return this.hppCliente.get<Page<BusinessPartner>>(this.url + "/pedido?page=" + page).pipe(
      map((page) => {
        page.content = page.content.map((ff) => {
          const parceiroNegocio = Object.assign(new BusinessPartner(), ff);
          return parceiroNegocio;
        });
        return page;
      })
    );
  }

  getPedidodeVendaBP(CardCode: string): Observable<Array<OrderSales>> {
    return this.hppCliente.get<Array<OrderSales>>(this.url + "/pedido-venda-parceiro/", { params: { CardCode } });
  }
}
