import { Injectable } from '@angular/core';

@Injectable()
export class ConfigService {

  private host: string;

  getHost(){
    if(this.host)
      return this.host
    let storageHost = localStorage.getItem("host")
    if(storageHost)
      return storageHost
    return "http://localhost:8080"
  }
}