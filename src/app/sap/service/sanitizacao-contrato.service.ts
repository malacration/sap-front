import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../core/services/config.service';

export interface DocumentoSanitizacao { docEntry: number; docNum: number; valor: number; }
export interface ApropriacaoSanitizacao extends DocumentoSanitizacao {
  transId: number; cancelada: boolean; adiantamento: number; contrato: number; cliente: string; filial: number;
}
export interface PernaSanitizacao {
  linha: number; conta: string; parceiro: string; filial: number;
  debito: number; credito: number; saldo: number; reconciliacoes: number[];
}
export interface ReconciliacaoSanitizacao {
  numero: number; tipo: number; data: string; cancelavel: boolean;
  participantes: { transId: number; linha: number; tipo: number; documento: number; valor: number }[];
}
export interface ReclassificacaoSanitizacao {
  transId: number; contrato: number; filial: number; cliente: string; nomeCliente: string;
  nota: DocumentoSanitizacao; situacaoNota: string; devolucoes: DocumentoSanitizacao[];
  pernas: PernaSanitizacao[]; apropriacoes: ApropriacaoSanitizacao[]; reconciliacoes: ReconciliacaoSanitizacao[];
  impedimentos: string[]; acoes: string[]; podeAplicar: boolean;
}
export interface PreviaSanitizacao { id: string; data: string; itens: ReclassificacaoSanitizacao[]; }
export interface ResultadoSanitizacao {
  transId: number; status: 'APLICADO' | 'REJEITADO' | 'CONFERIR'; mensagem: string;
  estorno?: number; cancelamentos: number[];
}

@Injectable({ providedIn: 'root' })
export class SanitizacaoContratoService {
  private url = this.config.getHost() + '/sanitizacao-contratos';
  constructor(private config: ConfigService, private http: HttpClient) {}

  previa() { return this.http.get<PreviaSanitizacao>(this.url + '/previa'); }
  aplicar(previaId: string, transId: number) {
    return this.http.post<ResultadoSanitizacao>(this.url + '/aplicar', { previaId, transId });
  }
}
