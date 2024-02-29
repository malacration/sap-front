import { HttpClient  } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';

@Injectable({
  providedIn: 'root'
})
export class TaxService {

    url = "http://localhost:8080/tax"

    constructor(private config : ConfigService, private hppCliente : HttpClient) {
    this.url = config.getHost()+"/tax"
    }

    getPdf(id : string) : Observable<Blob>{
        return this.hppCliente
            .get<Blob>(
                this.url+"/"+id+"/pdf",
                { observe: 'body', responseType: 'blob' as 'json' }
            )
    }
}
