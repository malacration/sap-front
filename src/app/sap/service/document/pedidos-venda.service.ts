import { Observable, map } from "rxjs";
import { DocumentService } from "../../components/marketing-document/core/documento.service";
import { Page } from "../../model/page.model";
import { DocumentLines, DocumentList } from "../../model/markting/document-list";
import { Column } from "../../../shared/components/table/column.model";
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ConfigService } from "../../../core/services/config.service";

@Injectable({
    providedIn: 'root'
  })
export class PedidosVendaService implements DocumentService{

    url = "http://localhost:8080/pedido-venda"

    constructor(config : ConfigService, private hppCliente : HttpClient){
        this.url = config.getHost()+"/pedido-venda"
    }

    getDefinition(): Column[] {
        return [
            new Column('ID', 'DocNum'),
            new Column('Código Cliente', 'routerLink'),
            new Column('Nome', 'CardName'),
            new Column('Produtos', 'produtosCurrency'),
            new Column('Frete', 'freteCurrency'),
            new Column('Valor Total', 'totalCurrency'),
            new Column('Criado em', 'dataCriacao'),
            new Column('Vendedor', 'SlpName'),
            new Column('Filial', 'filialFormatada'),
            new Column('Status', 'situacao'),
        ];
    }

    filtro: { status?: string; filial?: number; cliente?: string; data?: string } = {};

    get(_pagina : number): Observable<Page<DocumentList>> {
        let params = `?`;
        if (this.filtro.status)  params += `status=${this.filtro.status}&`;
        if (this.filtro.filial != null && this.filtro.filial !== -1)  params += `filial=${this.filtro.filial}&`;
        if (this.filtro.cliente) params += `cliente=${this.filtro.cliente}&`;
        if (this.filtro.data)    params += `data=${this.filtro.data}&`;

        return this.hppCliente
            .get<{ content: any[]; nextLink?: string }>(this.url + "/listar" + params)
            .pipe(map((response) => this.mapPage(response)));
    }

    getNextLink(nextLink: string): Observable<Page<DocumentList>> {
        return this.hppCliente
            .post<{ content: any[]; nextLink?: string }>(this.url + "/listar/nextlink", nextLink)
            .pipe(map((response) => this.mapPage(response)));
    }

    getLinhas(docEntry: number): Observable<DocumentLines[]> {
        return this.hppCliente
            .get<any[]>(`${this.url}/${docEntry}/linhas`)
            .pipe(map((items) => items.map((item) => {
                const linha = new DocumentLines();
                linha.ItemCode        = item.ItemCode ?? item.itemCode;
                linha.ItemDescription = item.Dscription ?? item.dscription;
                linha.Quantity        = item.Quantity ?? item.quantity;
                linha.UnitPrice       = item.PrecoNegociado ?? item.precoNegociado;
                linha.LineTotal       = linha.Quantity * linha.UnitPrice;
                return linha;
            })));
    }

    search(U_Ordem_Carregamento: number): Observable<any> {
        return this.hppCliente.get(`${this.url}/findLoadOrders?U_Ordem_Carregamento=${U_Ordem_Carregamento}`);
    }

    searchLocalidade(Code: number): Observable<any> {
        return this.hppCliente.get(`${this.url}/searchLocality?Code=${Code}`);
    }

    private mapPage(response: { content: any[]; nextLink?: string }): Page<DocumentList> {
        const page = new Page<DocumentList>();
        page.nextLink = response.nextLink ?? '';
        page.content = (response.content ?? []).map((item) => this.mapItem(item));
        page.totalElements = page.content.length;
        page.size = page.content.length;
        return page;
    }

    private mapItem(item: { docNum: string; cardCode: string; cardName: string; docDate: string; docTotal: number; valorFrete: number; bplname: string; bplid: number; slpName: string; documentLines: any[]; documentStatus: string; docObjectCode: string; docEntry: number }): DocumentList {
        const doc = new DocumentList();
        doc.DocNum        = item.docNum;
        doc.CardCode      = item.cardCode;
        doc.CardName      = item.cardName;
        doc.DocDate       = item.docDate;
        doc.DocTotal      = item.docTotal ?? 0;
        doc.BPLName       = item.bplname;
        doc.BPL_IDAssignedToInvoice = item.bplid;
        doc.SlpName       = item.slpName;
        doc.DocumentLines = item.documentLines ?? [];
        doc.DocumentAdditionalExpenses = [{ LineTotal: item.valorFrete ?? 0 }];
        doc.DocumentStatus = item.documentStatus ?? '';
        doc.DocObjectCode  = item.docObjectCode;
        doc.DocEntry       = item.docEntry;
        return doc;
    }

}
