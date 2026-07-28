import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Column } from '../../../shared/components/table/column.model';
import { CobrancaTitulo } from '../../model/cobranca/cobranca-titulo';
import { CobrancaDominio } from '../../model/cobranca/cobranca-dominio';
import { CobrancaHistorico } from '../../model/cobranca/cobranca-historico';

export interface CobrancaFiltro {
  filial?: number | null;
  vendedor?: number | null;
  cliente?: string | null;
  data?: string | null;
  diasAtrasoMin?: number | null;
  status?: string | null;
  cobrador?: string | null;
  situacao?: string | null;
  situacaoSap?: string | null;
  vencimentoDe?: string | null;
  vencimentoAte?: string | null;
  tipo?: string | null;
  pagina?: number | null;
  tamanho?: number | null;
}

export interface CobrancaAcaoPayload {
  status?: string | null;
  acao?: string | null;
  situacao?: string | null;
  ocorrencia?: string | null;
  observacao?: string | null;
  dataPromessa?: string | null;
}

export interface CobrancaAcaoLoteItem extends CobrancaAcaoPayload {
  tipo: string;
  docEntry: number;
  instlmntId: number;
}

export interface CobrancaAcaoResultado {
  tipo: string;
  docEntry: number;
  instlmntId: number;
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CobrancaService {
  private url: string;

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = `${this.config.getHost()}/cobranca`;
  }

  listar(filtro: CobrancaFiltro = {}): Observable<CobrancaTitulo[]> {
    let params = new HttpParams();
    Object.keys(filtro).forEach((chave) => {
      const valor = (filtro as any)[chave];
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(chave, valor.toString());
      }
    });

    return this.http
      .get<any[]>(`${this.url}/titulos`, { params })
      .pipe(map((lista) => (lista ?? []).map((item) => CobrancaTitulo.from(item))));
  }

  historico(tipo: string, docEntry: number, instlmntId: number): Observable<CobrancaHistorico[]> {
    return this.http
      .get<any[]>(`${this.url}/titulos/${tipo}/${docEntry}/${instlmntId}/historico`)
      .pipe(map((lista) => (lista ?? []).map((item) => Object.assign(new CobrancaHistorico(), item))));
  }

  registrarAcao(tipo: string, docEntry: number, instlmntId: number, payload: CobrancaAcaoPayload): Observable<any> {
    return this.http.post(`${this.url}/titulos/${tipo}/${docEntry}/${instlmntId}/acao`, payload);
  }

  registrarAcaoEmLote(itens: CobrancaAcaoLoteItem[]): Observable<CobrancaAcaoResultado[]> {
    return this.http.post<CobrancaAcaoResultado[]>(`${this.url}/titulos/acoes`, itens);
  }

  dominios(tipo?: string): Observable<CobrancaDominio[]> {
    let params = new HttpParams();
    if (tipo) {
      params = params.set('tipo', tipo);
    }
    return this.http
      .get<any[]>(`${this.url}/dominios`, { params })
      .pipe(map((lista) => (lista ?? []).map((item) => Object.assign(new CobrancaDominio(), item))));
  }

  getDefinition(): Column[] {
    return [
      new Column('Tipo', 'tipoLabel'),
      new Column('Vendedor', 'SlpName'),
      new Column('Filial', 'filialFormatada', '<span class="cel-filial" title="{{value}}">{{value}}</span>'),
      new Column('Dias Atraso', 'DiasAtraso'),
      new Column('NF', 'serieFormatada'),
      new Column('Parcela', 'InstlmntID'),
      new Column('Código', 'CardCode'),
      new Column('Cliente', 'CardName'),
      new Column('Data Lançamento', 'docDateFormatado'),
      new Column('Vencimento', 'vencimentoFormatado'),
      new Column('Saldo', 'saldoCurrency'),
      new Column('Status', 'U_Status'),
      new Column('Cobrador', 'U_Cobrador'),
      new Column('Ação de Cobrança', 'U_Acao'),
      new Column('Situação', 'U_Situacao'),
      new Column('Ocorrência', 'U_Ocorrencia'),
      new Column('Situação SAP', 'situacaoSapLabel'),
    ];
  }
}
