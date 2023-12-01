import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BusinessPartner } from '../model/business-partner';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class BusinessPartnerService {

  url = "http://localhost:8080/business-partners"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/business-partners"
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

  getByCpfCnpj(cpfCnpj : string) : Observable<BusinessPartner>{
    cpfCnpj = cpfCnpj.replace(/\D/g, '');
    return this.hppCliente
      .get<BusinessPartner>(this.url+"/cpf-cnpj/"+cpfCnpj)
      .pipe(map((pn) => Object.assign(new BusinessPartner(),pn)))
  }
}
