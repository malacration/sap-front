import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BusinessPartner } from '../model/business-partner';

@Injectable({
  providedIn: 'root'
})
export class BusinessPartnerService {

  url = "http://localhost:8080/business-partners"
  
  constructor(private hppCliente : HttpClient) { 
    let host = localStorage.getItem("host")
    if(host)
      this.url = host+"/business-partners"
  }

  getByUpdate(hashCode : string) : Observable<BusinessPartner>{
    return this.hppCliente
      .get<BusinessPartner>(this.url+"/key/"+hashCode)
      .pipe(map((pn) => Object.assign(new BusinessPartner(),pn)))
  }

  save(hashCode : string, pn : BusinessPartner) : Observable<BusinessPartner> {
    return this.hppCliente.post<BusinessPartner>(this.url+"/key/"+hashCode,pn)
  }
}
