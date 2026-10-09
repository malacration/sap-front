import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable } from 'rxjs';
import { ConfigService } from '../core/services/config.service';
import { ensureFreshToken } from '../core/keycloak';
import { AuthService } from './service/auth.service';

export interface ChatEvent {
  type: string;
  from: string;
  text: string;
  ts: number;
}


@Injectable({
  providedIn: 'root'
})
export class WsService {

  private client: Client;
  private connected = false;

  constructor(
    private config : ConfigService,
    private auth : AuthService
  ) {
    this.client = new Client({
      reconnectDelay: 5000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 20000,
      debug: () => undefined
    });
    // O SockJS nao manda header HTTP: o token vai no frame CONNECT e o back valida no
    // StompAuthChannelInterceptor. Roda a cada (re)conexao, entao pega o token renovado.
    this.client.beforeConnect = async () => {
      const token = await ensureFreshToken();
      this.client.connectHeaders = token ? { Authorization: token } : {};
    };
  }

  /** Conecta so com usuario logado: o back recusa CONNECT sem token. */
  connect(url?: string) {
    if (!this.auth.isLoggedIn()) return;
    if (this.connected || this.client.active) return;
    if (url) {
      this.client.webSocketFactory = () => new SockJS(url);
    }
    if (!this.client.webSocketFactory && !this.client.brokerURL) {
      console.warn('WsService.connect called without a WebSocket URL.');
      return;
    }

    this.client.onConnect = () => {
      this.connected = true;
    };

    this.client.onWebSocketClose = () => {
      this.connected = false;
      // sessao acabou (logout/token expirado): para de tentar reconectar a cada 5s
      if (!this.auth.isLoggedIn()) this.disconnect();
    };

    this.client.onStompError = (frame) => {
      console.error('Broker error', frame.headers['message'], frame.body);
    };

    this.client.activate();
  }

  subscribe<T>(destination: string): Observable<T> {
    return new Observable<T>((observer) => {
      let sub: StompSubscription | null = null;
      const wait = setInterval(() => {
        if (this.connected) {
          clearInterval(wait);
          sub = this.client.subscribe(this.buildSubscribeDestination(destination), (msg: IMessage) => {
            observer.next(JSON.parse(msg.body));
          });
        }
      }, 50);

      return () => {
        clearInterval(wait);
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  }

  request<T>(destination: string, payload: any): Observable<T> {
    return new Observable<T>((observer) => {
      let sub: StompSubscription | null = null;
      const wait = setInterval(() => {
        if (this.connected) {
          clearInterval(wait);
          sub = this.client.subscribe(this.buildSubscribeDestination(destination), (msg: IMessage) => {
            observer.next(JSON.parse(msg.body));
          });
          this.client.publish({
            destination,
            body: JSON.stringify(payload)
          });
        }
      }, 50);

      return () => {
        clearInterval(wait);
        if (sub) {
          sub.unsubscribe();
        }
      };
    });
  }

  private buildSubscribeDestination(destination: string): string {
    if (!this.config.subscribePrefix) return destination;
    const prefix = this.config.subscribePrefix.endsWith('/') ? this.config.subscribePrefix.slice(0, -1) : this.config.subscribePrefix;
    const dest = destination.startsWith('/') ? destination : `/${destination}`;
    console.log(`${prefix}${dest}`)
    return `${prefix}${dest}`;
  }

  send(destination: string, payload: any) {
    if (!this.connected) {
      console.warn('WsService.send called while not connected.');
      return;
    }
    this.client.publish({
      destination,
      body: JSON.stringify(payload)
    });
  }

  disconnect() {
    if (!this.client.active) return;
    this.client.deactivate();
    this.connected = false;
  }

  /**
   * Refaz a conexao com o usuario atual. A sessao STOMP fica presa ao usuario do CONNECT, entao
   * apos login/troca de usuario e preciso reconectar; apos logout so desconecta.
   */
  async reconnect(url?: string) {
    if (this.client.active) await this.client.deactivate();
    this.connected = false;
    this.connect(url);
  }
}
