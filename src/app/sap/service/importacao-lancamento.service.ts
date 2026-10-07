import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../core/services/config.service';

export interface LinhaLancamento {
  linha: number;
  filial: number | null;
  data: string | null;
  contaDebito: string;
  contaCredito: string;
  valor: number | null;
  historico: string;
  grupoEconomico: string | null;
  centroCusto: string | null;
  referencia: string | null;
  referencia2: string | null;
  referencia3: string | null;
  erros: string[];
  avisos: string[];
  /** Lançamento do SAP igual a esta linha (referência, data, conta de débito e valor): transação e número. */
  lancamentoIgual: number | null;
  numeroLancamentoIgual: number | null;
  nomeContaDebito: string | null;
  nomeContaCredito: string | null;
}

/** Quanto o arquivo lança em uma conta, somando as linhas em que ela é débito ou crédito. */
export interface ResumoConta {
  conta: string;
  nome: string | null;
  debito: number;
  credito: number;
  saldo: number;
  linhas: number;
}

export interface ImportacaoAnterior { id: string; usuario: string; data: string; hora: string; }

export interface PreviaImportacaoLancamento {
  arquivo: string;
  hash: string;
  codificacao: string;
  linhas: LinhaLancamento[];
  erros: string[];
  importacoesAnteriores: ImportacaoAnterior[];
  totalLinhas: number;
  totalValor: number;
  linhasComErro: number;
  linhasComAviso: number;
  linhasJaNoSap: number;
  podeImportar: boolean;
  /** Importar duplicaria lançamentos (arquivo já importado ou linhas já no SAP): exige confirmação. */
  exigeConfirmacao: boolean;
  resumoPorConta: ResumoConta[];
}

/** Lançamento criado para uma linha do arquivo: transação e o "Número" da tela do SAP. */
export interface LancamentoGerado { linha: number; transacao: number; numero: number | null; }

export interface ResultadoImportacaoLancamento {
  id: string;
  status: 'IMPORTADO' | 'CONFERIR';
  /** Transações criadas, na ordem das linhas. */
  lancamentos: number[];
  mensagem: string;
  porLinha: LancamentoGerado[];
}

/** Uma importação no histórico, com os lançamentos que ela gerou (vazio se não foram registrados). */
export interface HistoricoImportacao {
  id: string;
  usuario: string | null;
  data: string | null;
  hora: string | null;
  arquivo: string | null;
  linhas: number | null;
  total: number | null;
  forcado: boolean;
  lancamentos: LancamentoGerado[];
}

/**
 * O arquivo vai cru (bytes) nas duas chamadas: o back decide a codificação (UTF-8 ou a
 * Windows-1252 do Excel) e o hash da prévia é o do arquivo exato que será importado.
 */
@Injectable({ providedIn: 'root' })
export class ImportacaoLancamentoService {
  private url = this.config.getHost() + '/journal/importacao';
  constructor(private config: ConfigService, private http: HttpClient) {}

  validar(arquivo: File) {
    return this.http.post<PreviaImportacaoLancamento>(this.url + '/validar', arquivo, {
      params: { arquivo: arquivo.name }, headers: { 'Content-Type': 'text/csv' },
    });
  }

  importar(arquivo: File, hash: string, forcarDuplicado: boolean) {
    return this.http.post<ResultadoImportacaoLancamento>(this.url, arquivo, {
      params: { arquivo: arquivo.name, hash, forcarDuplicado: String(forcarDuplicado) },
      headers: { 'Content-Type': 'text/csv' },
    });
  }

  historico() { return this.http.get<HistoricoImportacao[]>(this.url + '/historico'); }
}
