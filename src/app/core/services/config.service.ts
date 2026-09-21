import { Injectable } from '@angular/core';
import { TipoOperacao } from '../../sap/model/tipo-operacao';

@Injectable()
export class ConfigService {

  private host: string;
  /**
   * Host do sap-reports, quando ele NAO esta atras do mesmo gateway.
   *
   * Vazio (o normal) = mesmo host, com o prefixo /api/sap-reports roteado pelo
   * gateway. Preenchido = acesso cruzado, e o sap-reports precisa liberar a
   * origem do front em `cors.origins`, senao o navegador barra no preflight.
   */
  private hostRelatorios: string;
  private webSocket: string;
  public title: string = 'SAP - A R Soluções';
  public commercial_phone : string = '69 9 9999 6666'
  private modoOperacao : string = "external"
  subscribePrefix = '/user/queue'
  tipoOperacao : Array<TipoOperacao> = Array()
  hmg = false
  primaryColor : string = '#25A246'
  successColor : string = '#198754'
  disableTogglefeature: string[] = []

  getHost(){
    if(this.host)
      return this.host
    let storageHost = localStorage.getItem("host")
    if(storageHost)
      return storageHost
    return "http://localhost:8080"
  }

  /**
   * Base da API de relatorios, ja com o sufixo /api/v1.
   *
   * Com `hostRelatorios` configurado o prefixo /api/sap-reports NAO entra: ele
   * existe so para o roteamento do gateway quando tudo compartilha o host.
   */
  getHostRelatorios(){
    const dedicado = this.hostRelatorios || localStorage.getItem("hostRelatorios")
    if(dedicado)
      return dedicado.replace(/\/+$/, '') + "/api/v1"
    return this.getHost().replace(/\/+$/, '') + "/api/sap-reports/api/v1"
  }

  getWebSocket(){
    if(this.webSocket)
      return this.webSocket
    else if(this.host)
      return this.host+"/ws"
    return "http://localhost:8080/ws"
  }

  getModoOperacao() : string{
    let modoOperacao = localStorage.getItem("modoOperacao")
    if(modoOperacao)
      return modoOperacao
    if(this.modoOperacao)
      return this.modoOperacao
  }
}
