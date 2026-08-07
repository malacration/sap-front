import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Column } from '../../../shared/components/table/column.model';
import { CobrancaTitulo } from '../../model/cobranca/cobranca-titulo';
import { CobrancaDominio } from '../../model/cobranca/cobranca-dominio';
import { CobrancaHistorico } from '../../model/cobranca/cobranca-historico';
import { CobrancaDashboard, CobrancaMes } from '../../model/cobranca/cobranca-dashboard';

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
  // Vêm do drill-down do dashboard: não têm controle próprio na tela de Títulos, e por isso
  // aparecem escritos na faixa "Filtrado a partir do Resultado" — filtro aplicado sem estar
  // visível deixa a lista misteriosamente curta.
  semAcompanhamento?: boolean | null;
  promessaVencidaAte?: string | null;
  tipo?: string | null;
  pagina?: number | null;
  tamanho?: number | null;
}

export interface CobrancaDashboardFiltro {
  filial?: number | null;
  vendedor?: number | null;
  de?: string | null;
  ate?: string | null;
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
    return this.http
      .get<any[]>(`${this.url}/titulos`, { params: this.montarParams(filtro) })
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

  // Duas chamadas separadas de propósito: o resumo custa ~16 consultas no SAP e a série
  // mensal custa mais uma paginada. Buscando em paralelo, os KPIs e o aging aparecem sem
  // esperar o gráfico de evolução.
  dashboard(filtro: CobrancaDashboardFiltro = {}): Observable<CobrancaDashboard> {
    return this.http
      .get<any>(`${this.url}/dashboard`, { params: this.montarParams(filtro) })
      .pipe(map((json) => CobrancaDashboard.from(json)));
  }

  evolucao(filtro: CobrancaDashboardFiltro = {}, meses = 6): Observable<CobrancaMes[]> {
    const params = this.montarParams({ ...filtro, de: null, ate: null }).set('meses', meses.toString());
    return this.http
      .get<any[]>(`${this.url}/dashboard/evolucao`, { params })
      .pipe(map((lista) => (lista ?? []).map((item) => Object.assign(new CobrancaMes(), item))));
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
      new Column('Status', 'statusFormatado'),
      new Column('Cobrador', 'cobradorFormatado'),
      new Column('Ação de Cobrança', 'acaoFormatada'),
      new Column('Situação', 'situacaoFormatada'),
      new Column('Ocorrência', 'ocorrenciaFormatada'),
      new Column('Situação SAP', 'situacaoSapLabel'),
    ];
  }

  private montarParams(filtro: object): HttpParams {
    let params = new HttpParams();
    Object.keys(filtro).forEach((chave) => {
      const valor = (filtro as any)[chave];
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(chave, valor.toString());
      }
    });
    return params;
  }
}
