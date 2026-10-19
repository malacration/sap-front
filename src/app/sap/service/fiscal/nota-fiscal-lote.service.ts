import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Column } from '../../../shared/components/table/column.model';
import { Page } from '../../model/page.model';
import {
  CategoriaDocumentoLote, FormaPagamentoLote, NotaFiscalLote, StatusSapNota, StatusSefaz, TrocaFormaPagamentoResultado,
} from '../../model/fiscal/nota-fiscal-lote';
import { BusinessPartner } from '../../model/business-partner/business-partner';

export interface NotaFiscalLoteFiltro {
  dataInicial?: string | null;
  dataFinal?: string | null;
  // Multi-selecao: vai como filial=2&filial=6 e o backend recebe List<Int>.
  filial?: number[] | null;
  cardCode?: string | null;
  salesPersonCode?: number | null;
  // Faixa de numero da NF; um lado so tambem vale.
  numeroDe?: number | null;
  numeroAte?: number | null;
  // A nota entra se QUALQUER parcela vence no intervalo.
  vencimentoDe?: string | null;
  vencimentoAte?: string | null;
  statusSap?: StatusSapNota | null;
  // ID da "ProcessStatus" da TaxPlus.
  statusSefaz?: number | null;
  // Nulo = todas (NF-e de saida, NF-e venda futura antiga e adiantamentos).
  categoria?: CategoriaDocumentoLote | null;
}

export interface NotaFiscalLoteDownload {
  arquivo: Blob;
  nome: string;
  notasComErro: number;
  // Notas sem boleto no zip; nao e erro (forma de pagamento sem boleto ou boleto cancelado).
  notasSemBoleto: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotaFiscalLoteService {

  // Mesmo teto do backend (nota-fiscal.lote.maximo). Se divergir, vale o do backend: ele recusa
  // o lote maior com mensagem.
  static readonly LIMITE_LOTE = 200;

  url = 'http://localhost:8080/nota-fiscal-lote';

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + '/nota-fiscal-lote';
  }

  listar(filtro: NotaFiscalLoteFiltro, page = 0, size = 50): Observable<Page<NotaFiscalLote>> {
    const params = this.montarParams(filtro).set('page', page).set('size', size);
    return this.http.get<Page<NotaFiscalLote>>(this.url, { params }).pipe(
      map((pagina) => {
        pagina.content = (pagina.content ?? []).map((nota) => NotaFiscalLote.from(nota));
        return pagina;
      })
    );
  }

  // Busca de cliente do filtro, sem o recorte de carteira do /business-partners/search: quem tem
  // so o perfil do lote precisa achar o cliente de qualquer nota. Mesmo contrato daquela busca.
  buscarClientes(palavra: string): Observable<Page<BusinessPartner>> {
    return this.http.post<Page<BusinessPartner>>(this.url + '/clientes/search', palavra).pipe(
      map((pagina) => {
        pagina.content = (pagina.content ?? []).map((cliente) => Object.assign(new BusinessPartner(), cliente));
        return pagina;
      })
    );
  }

  statusSefaz(): Observable<StatusSefaz[]> {
    return this.http.get<StatusSefaz[]>(this.url + '/status-sefaz');
  }

  // OINV e ODPI tem DocEntry proprio: o backend recebe NF e adiantamentos em listas separadas.
  static porTipo(documentos: NotaFiscalLote[]): { docEntries: number[]; adiantamentos: number[] } {
    return {
      docEntries: documentos.filter((d) => d.tipo !== 'AD').map((d) => d.docEntry),
      adiantamentos: documentos.filter((d) => d.tipo === 'AD').map((d) => d.docEntry),
    };
  }

  baixar(documentos: NotaFiscalLote[], pdf: boolean, xml: boolean, boleto = false): Observable<NotaFiscalLoteDownload> {
    const corpo = { ...NotaFiscalLoteService.porTipo(documentos), pdf, xml, boleto };
    return this.http
      .post(this.url + '/download', corpo, { observe: 'response', responseType: 'blob' })
      .pipe(
        map((resposta: HttpResponse<Blob>) => ({
          arquivo: resposta.body,
          nome: this.nomeArquivo(resposta, 'notas-fiscais.zip'),
          notasComErro: Number(resposta.headers.get('notas-com-erro') || 0),
          notasSemBoleto: Number(resposta.headers.get('notas-sem-boleto') || 0),
        }))
      );
  }

  formasPagamento(): Observable<FormaPagamentoLote[]> {
    return this.http.get<FormaPagamentoLote[]>(this.url + '/formas-pagamento');
  }

  // Grava no SAP: troca a forma dos documentos e, se o parceiro nao tiver a forma, vincula a ele.
  trocarFormaPagamento(formaPagamento: string, documentos: NotaFiscalLote[]): Observable<TrocaFormaPagamentoResultado[]> {
    return this.http.post<TrocaFormaPagamentoResultado[]>(this.url + '/forma-pagamento',
      { formaPagamento, ...NotaFiscalLoteService.porTipo(documentos) });
  }

  getDefinition(): Column[] {
    return [
      // Toda coluna com texto vindo do SAP passa por '{{value}}': a tabela renderiza a celula via
      // innerHTML sem sanitizar, e o Handlebars escapa (so {{{value}}} nao escaparia).
      new Column('Tipo', 'tipoHtml'),
      new Column('Nº / Série', 'notaFormatada', '{{value}}'),
      new Column('Contrato', 'contratoFormatado'),
      new Column('Emissão', 'dataFormatada'),
      new Column('Vencimento', 'vencimentoFormatado'),
      new Column('Filial', 'filialFormatada', '<span class="cel-filial" title="{{value}}">{{value}}</span>'),
      new Column('Código', 'cardCode', '{{value}}'),
      new Column('Cliente', 'cardName', '{{value}}'),
      new Column('Vendedor', 'vendedor', '{{value}}'),
      new Column('Total', 'totalCurrency'),
      new Column('Forma de pagamento', 'formaPagamento', '{{value}}'),
      new Column('Status SAP', 'statusSapLabel'),
      new Column('Status SEFAZ', 'statusSefazLabel', '{{value}}'),
      new Column('Chave de acesso', 'chaveAcesso', '<span class="cel-chave">{{value}}</span>'),
    ];
  }

  private nomeArquivo(resposta: HttpResponse<Blob>, fallback: string): string {
    const disposition = resposta.headers.get('Content-Disposition') || '';
    const nome = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
    return nome?.split(/[\\/]/).pop() || fallback;
  }

  private montarParams(filtro: object): HttpParams {
    let params = new HttpParams();
    Object.keys(filtro).forEach((chave) => {
      const valor = (filtro as any)[chave];
      if (Array.isArray(valor)) {
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
