import { Injectable } from '@angular/core';
import { TipoOperacao } from '../../sap/model/tipo-operacao';

@Injectable()
export class ConfigService {

  private host: string;
  /**
   * Host do sap-reports, quando ele NAO esta no mesmo host do back.
   *
   * Vazio (o normal) = mesmo host do back, em /reports, roteado pelo Traefik
   * (stack sap-service no repo swarm). Preenchido = outro endereco, como em
   * desenvolvimento (http://localhost:2030).
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
   * Sem `hostRelatorios`, usa a ORIGEM do back (esquema + host), e nao o host
   * inteiro: o back do v7 e configurado como https://<back>/v7, e /v7/reports
   * cairia no roteador do v7 em vez do sap-reports.
   */
  getHostRelatorios(){
    const dedicado = this.hostRelatorios || localStorage.getItem("hostRelatorios")
    if(dedicado)
      return dedicado.replace(/\/+$/, '') + "/api/v1"
    return ConfigService.origemDe(this.getHost()) + "/reports/api/v1"
  }

  /** `https://back/v7/` -> `https://back`. Host invalido e devolvido sem a barra final. */
  static origemDe(host: string): string {
    try {
      return new URL(host).origin
    } catch {
      return host.replace(/\/+$/, '')
    }
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
