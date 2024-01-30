import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BusinessPartner } from '../model/business-partner';
import { ConfigService } from '../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class OneTimePasswordService {

  url = "http://localhost:8080/otp"
  
  constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/otp"
  }

  generateOtpByContact(cpfCnpj : string, contatc : string) : Observable<Array<any>>{
    cpfCnpj = cpfCnpj.replace(/\D/g, '');
    return this.hppCliente
      .get<Array<any>>(this.url+"/cpf-cnpj/"+cpfCnpj+"?otp="+contatc)
  }


  loginOtp(cpfCnpj : string, otp : string) : Observable<string>{
    cpfCnpj = cpfCnpj.replace(/\D/g, '');
    let body = {
      cpfCnpj : cpfCnpj,
      otp : otp
    }

    let httpOptions = {
      headers: new HttpHeaders({
        'Accept': 'text/html, application/xhtml+xml, */*',
        'Content-Type': 'application/x-www-form-urlencoded'
      }),
      responseType: 'text' as 'json'
    };

    return this.hppCliente
      .post<string>(this.url+"/login",body,httpOptions)
  }
}
