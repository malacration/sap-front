import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from '../../core/services/config.service';

export interface RetornoDescontado {
  retorno: number; arquivo: string; dataArquivo: string | null; contrato: number; convenio: string;
  filial: number | null; nomeFilial: string | null; boletos: number; jaPagos: number; semSituacao: number;
  totalFace: number; totalIof: number; totalJuros: number;
  lcm: number | null; lcmBankPlus: number | null;
}
export interface TituloDescontado {
  nossoNumero: string; documento: string | null; cliente: string | null; nomeCliente: string | null;
  dataOcorrencia: string | null; vencimento: string | null;
  valorFace: number; iof: number; juros: number; divergencia: string | null; jaPago: boolean;
  situacao: number | null; semSituacaoDescontada: boolean;
}
export interface LinhaLcmRetorno {
  descricao: string; conta: string; debito: number; credito: number;
  costingCode?: string | null; costingCode2?: string | null;
}
export interface PreviaLancamentoRetorno {
  retorno: number; arquivo: string; dataArquivo: string | null; contrato: number; convenio: string;
  filial: number | null; nomeFilial: string | null; dataLancamento: string | null;
  reference: string; memo: string;
  titulos: TituloDescontado[];
  totalFace: number; totalIof: number; totalJuros: number;
  linhas: LinhaLcmRetorno[];
  lcmExistente: number | null; lcmBankPlus: number | null; erros: string[]; avisos: string[]; podeLancar: boolean;
}
export interface ResultadoLancamentoRetorno {
  //null quando a previa tem erro e nada foi lancado
  jdtNum: number | null; jaExistia: boolean; previa: PreviaLancamentoRetorno;
}

export interface RetornoAutomatico {
  //"Y" ligado; U_Data ("2026-11-05T09:30:00") e quando foi ligado ou desligado
  U_Ativo: string; U_Usuario?: string; U_Data?: string;
}
export interface RetornoHistorico {
  Code: string; U_Retorno?: number; U_Origem: string; U_Resultado: string; U_Lcm?: number;
  U_Valor?: number; U_Mensagem?: string; U_Usuario?: string; U_Data: string;
}

/** Lancamento de Retorno: LCM do desconto de duplicatas a partir dos retornos importados no BankPlus. */
@Injectable({ providedIn: 'root' })
export class LancamentoRetornoService {

  private url: string

  constructor(config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + '/lancamento-retorno'
  }

  /** Retornos com ocorrencia de desconto pela data do arquivo; datas em "yyyy-MM-dd". */
  retornos(de: string, ate: string): Observable<RetornoDescontado[]> {
    return this.http.get<RetornoDescontado[]>(this.url + '/retornos', { params: { de, ate } })
  }

  /** Mostra o LCM que seria gerado, sem gravar nada. */
  previa(retorno: number): Observable<PreviaLancamentoRetorno> {
    return this.http.get<PreviaLancamentoRetorno>(`${this.url}/retornos/${retorno}/previa`)
  }

  lancar(retorno: number): Observable<ResultadoLancamentoRetorno> {
    return this.http.post<ResultadoLancamentoRetorno>(`${this.url}/retornos/${retorno}/lancar`, null)
  }

  automatico(): Observable<RetornoAutomatico> {
    return this.http.get<RetornoAutomatico>(this.url + '/automatico')
  }

  definirAutomatico(ativo: boolean): Observable<RetornoAutomatico> {
    return this.http.put<RetornoAutomatico>(this.url + '/automatico', { ativo })
  }

  /** Ultimos lancamentos, recusas e liga/desliga, mais recentes primeiro. */
  historico(): Observable<RetornoHistorico[]> {
    return this.http.get<RetornoHistorico[]>(this.url + '/historico')
  }
}
