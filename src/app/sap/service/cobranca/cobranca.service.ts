import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Column } from '../../../shared/components/table/column.model';
import { CobrancaTitulo } from '../../model/cobranca/cobranca-titulo';
import { CobrancaDominio } from '../../model/cobranca/cobranca-dominio';
import { CobrancaHistorico } from '../../model/cobranca/cobranca-historico';
import { CobrancaDashboard, CobrancaMes } from '../../model/cobranca/cobranca-dashboard';
import { CobrancaTitulosTotal } from '../../model/cobranca/cobranca-titulos-total';

export interface CobrancaFiltro {
  // Multi-selecao: vai como filial=6&filial=7 e o backend recebe List<Int>.
  filial?: number[] | null;
  vendedor?: number | null;
  cliente?: string | null;
  data?: string | null;
  status?: string | null;
  // Diz ao backend que o status escolhido também casa com U_Status vazio.
  incluirSemStatus?: boolean | null;
  cobrador?: string | null;
  situacao?: string | null;
  situacaoSap?: string | null;
  vencimentoDe?: string | null;
  vencimentoAte?: string | null;
  // Meses de lançamento (YYYY-MM). Multi-seleção: vai repetido como lancamentoMes=2026-07&
  // lancamentoMes=2026-08 e o backend recebe List<String>.
  lancamentoMes?: string[] | null;
  semAcompanhamento?: boolean | null;
  // Inverso do de cima: só título que já tem registro de cobrança. É o recorte do card
  // "Recuperado" do dashboard. Ligar os dois juntos devolve lista vazia.
  comAcompanhamento?: boolean | null;
  promessaVencidaAte?: string | null;
  // A vista = lançado e vencido no mesmo dia (DocDate = DueDate).
  ocultarAvista?: boolean | null;
  // Recorte do drill-down do card "Recuperado" do dashboard: filtra pela data do recebimento
  // (não vencimento), pro mesmo período que o dashboard está mostrando.
  dataPagamentoDe?: string | null;
  dataPagamentoAte?: string | null;
  tipo?: string | null;
  pagina?: number | null;
  tamanho?: number | null;
}

export interface CobrancaDashboardFiltro {
  filial?: number[] | null;
  vendedor?: number | null;
  cobrador?: string | null;
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

  // Total do filtro inteiro, não só da página carregada. O backend roda o mesmo pipeline do
  // `listar` (mesmo SQL + mesmo filtro em Kotlin), então o número bate com o que a tela mostraria.
  totais(filtro: CobrancaFiltro = {}): Observable<CobrancaTitulosTotal> {
    return this.http
      .get<any>(`${this.url}/titulos/totais`, { params: this.montarParams(filtro) })
      .pipe(map((json) => CobrancaTitulosTotal.from(json)));
  }

  historico(tipo: string, docEntry: number, instlmntId: number): Observable<CobrancaHistorico[]> {
    return this.http
      .get<any[]>(`${this.url}/titulos/${tipo}/${docEntry}/${instlmntId}/historico`)
      .pipe(map((lista) => (lista ?? []).map((item) => Object.assign(new CobrancaHistorico(), item))));
  }

  // Devolve o histórico que sobrou: quem removeu já vê a linha sumir sem uma segunda requisição.
  removerHistorico(tipo: string, docEntry: number, instlmntId: number, lineId: number): Observable<CobrancaHistorico[]> {
    return this.http
      .delete<any[]>(`${this.url}/titulos/${tipo}/${docEntry}/${instlmntId}/historico/${lineId}`)
      .pipe(map((lista) => (lista ?? []).map((item) => Object.assign(new CobrancaHistorico(), item))));
  }

  registrarAcao(tipo: string, docEntry: number, instlmntId: number, payload: CobrancaAcaoPayload): Observable<any> {
    return this.http.post(`${this.url}/titulos/${tipo}/${docEntry}/${instlmntId}/acao`, payload);
  }

  registrarAcaoEmLote(itens: CobrancaAcaoLoteItem[]): Observable<CobrancaAcaoResultado[]> {
    return this.http.post<CobrancaAcaoResultado[]>(`${this.url}/titulos/acoes`, itens);
  }

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

  // Vem do banco, não das linhas carregadas: a lista precisa incluir cobrador cujos títulos
  // não estão na página atual, senão não dá pra filtrar por ele.
  cobradores(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.url}/cobradores`)
      .pipe(map((lista) => lista ?? []));
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
      new Column('Telefone', 'telefoneFormatado'),
      new Column('Data Lançamento', 'docDateFormatado'),
      new Column('Vencimento', 'vencimentoFormatado'),
      new Column('Saldo', 'saldoCurrency'),
      new Column('Status', 'statusFormatado'),
      new Column('Cobrador', 'cobradorFormatado'),
      new Column('Ação de Cobrança', 'acaoFormatada'),
      new Column('Situação', 'situacaoFormatada'),
      new Column('Ocorrência', 'ocorrenciaFormatada'),
      new Column('Situação SAP', 'situacaoSapLabel'),
      new Column('Data Pagamento', 'dataPagamentoFormatada'),
      new Column('Valor Pago', 'valorPagoCurrency'),
      // ORCT.Comments vem direto do SAP sem escape - a tabela renderiza toda celula via
      // innerHTML (appSafeHtml faz bypassSecurityTrustHtml sem sanitizar). O 3o argumento
      // '{{value}}' passa pelo Handlebars, que HTML-escapa por padrao (so {{{value}}} nao
      // escaparia) - mesmo mecanismo ja usado na coluna Filial pra neutralizar HTML/JS injetado.
      new Column('Observação Pagamento', 'observacaoPagamentoFormatada', '{{value}}').withWrap(),
    ];
  }

  private montarParams(filtro: object): HttpParams {
    let params = new HttpParams();
    Object.keys(filtro).forEach((chave) => {
      const valor = (filtro as any)[chave];
      if (Array.isArray(valor)) {
        // Repetido (chave=a&chave=b) em vez de "a,b": e o formato que o Spring lê como
        // List<T> sem depender do split por vírgula do ConversionService.
        valor
          .filter((item) => item !== null && item !== undefined && item !== '')
          .forEach((item) => {
            params = params.append(chave, item.toString());
          });
        return;
      }
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(chave, valor.toString());
      }
    });
    return params;
  }
}
