import { Injectable } from '@angular/core';
import { TipoOperacao } from '../../sap/model/tipo-operacao';

@Injectable()
export class ConfigService {

  private host: string;
  public title: string = 'SAP - A R Soluções';
  public commercial_phone : string = '69 9 9999 6666'
  private modoOperacao : string = "external"
  tipoOperacao : Array<TipoOperacao> = Array()
  hmg = false
  primaryColor : string = '#0d6efd'
  successColor : string = '#198754'

  getHost(){
    if(this.host)
      return this.host
    let storageHost = localStorage.getItem("host")
    if(storageHost)
      return storageHost
    return "http://localhost:8080"
  }

  getModoOperacao() : string{
    let modoOperacao = localStorage.getItem("modoOperacao")
    if(modoOperacao)
      return modoOperacao
    if(this.modoOperacao)
      return this.modoOperacao
  }
}