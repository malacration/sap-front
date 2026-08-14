import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ConfigService } from '../../../core/services/config.service';
import { Column } from '../../../shared/components/table/column.model';
import { DocumentService } from '../../components/marketing-document/core/documento.service';
import { DocumentInstallment, DocumentLines, DocumentList } from '../../model/markting/document-list';
import { Page } from '../../model/page.model';

export type SapDocumentKind = 'nota-fiscal' | 'adiantamento' | 'devolucao' | 'recebimento';

export interface SapDocumentConfig {
  kind: SapDocumentKind;
  title: string;
  endpoint: string;
  idColumn: string;
  idProperty: string;
  docObjectCode: string;
}

export const SAP_DOCUMENT_CONFIGS: { [kind: string]: SapDocumentConfig } = {
  'nota-fiscal': {
    kind: 'nota-fiscal',
    title: 'Notas Fiscais',
    endpoint: 'invoice',
    idColumn: 'Nota Fiscal',
    idProperty: 'invoiceRouterLink',
    docObjectCode: 'oInvoices',
  },
  adiantamento: {
    kind: 'adiantamento',
    title: 'Adiantamentos',
    endpoint: 'down-payment',
    idColumn: 'Adiantamento',
    idProperty: 'downPaymentRouterLink',
    docObjectCode: 'oDownPayments',
  },
  devolucao: {
    kind: 'devolucao',
    title: 'Devoluções',
    endpoint: 'credit-notes',
    idColumn: 'Devolução',
    idProperty: 'creditNoteRouterLink',
    docObjectCode: 'oCreditNotes',
  },
  recebimento: {
    kind: 'recebimento',
    title: 'Recebimentos',
    endpoint: 'incoming-payments',
    idColumn: 'Recebimento',
    idProperty: 'incomingPaymentRouterLink',
    docObjectCode: 'oIncomingPayments',
  },
};

@Injectable({
  providedIn: 'root'
})
export class SapDocumentServiceFactory {

  constructor(private config: ConfigService, private http: HttpClient) {}

  create(kind: SapDocumentKind): DocumentService {
    return new SapDocumentService(
      `${this.config.getHost()}/${SAP_DOCUMENT_CONFIGS[kind].endpoint}`,
      SAP_DOCUMENT_CONFIGS[kind],
      this.http
    );
  }
}

class SapDocumentService implements DocumentService {

  constructor(private url: string, private config: SapDocumentConfig, private http: HttpClient) {}

  getDefinition(): Column[] {
    const definition = [
      new Column(this.config.idColumn, this.config.idProperty),
      new Column('Código Parceiro', 'routerLink'),
      new Column('Nome', 'CardName'),
      new Column('Produtos', 'produtosCurrency'),
      new Column('Frete', 'freteCurrency'),
      new Column('Valor Total', 'totalCurrency'),
      new Column('Criado em', 'dataCriacao'),
      new Column('Vendedor', 'SlpName'),
      new Column('Filial', 'filialFormatada'),
      new Column('Status', 'situacao')
    ];
    if (this.config.kind !== 'recebimento') {
      definition.splice(definition.length - 1, 0, new Column('Vencimento', 'vencimento'));
    }
    return definition;
  }

  get(pagina: number): Observable<Page<DocumentList>> {
    return this.http
      .get<Page<any>>(`${this.url}?page=${pagina}&size=20`)
      .pipe(map((page) => {
        page.content = (page.content || []).map((item) => this.mapDocument(item));
        return page as Page<DocumentList>;
      }));
  }

  getById(docEntry: number): Observable<DocumentList> {
    return this.http
      .get<any>(`${this.url}/${docEntry}`)
      .pipe(map((item) => this.mapDocument(this.unwrapOData(item))));
  }

  private unwrapOData(item: any): any {
    return item?.value ?? item;
  }

  private mapDocument(item: any): DocumentList {
    const doc = new DocumentList();
    doc.DocEntry = this.numberValue(item.DocEntry, item.docEntry);
    doc.DocNum = this.stringValue(item.DocNum, item.docNum, doc.DocEntry);
    doc.CardCode = this.stringValue(item.CardCode, item.cardCode);
    doc.CardName = this.stringValue(item.CardName, item.cardName);
    doc.DocDate = this.stringValue(item.DocDate, item.docDate, item.CreateDate, item.createDate);
    doc.DocDueDate = this.stringValue(item.DocDueDate, item.docDueDate);
    doc.DocTotal = this.numberValue(item.DocTotal, item.docTotal, item.CashSum, item.cashSum);
    doc.DocumentStatus = this.stringValue(item.DocumentStatus, item.documentStatus, item.DocStatus, item.docStatus);
    doc.DocStatus = this.stringValue(item.DocStatus, item.docStatus);
    doc.DocumentAdditionalExpenses = this.mapExpenses(item.DocumentAdditionalExpenses ?? item.documentAdditionalExpenses);
    doc.DocumentLines = this.mapLines(item.DocumentLines ?? item.documentLines);
    doc.DocumentInstallments = this.mapInstallments(item.DocumentInstallments ?? item.documentInstallments);
    doc.SequenceSerial = this.stringValue(item.SequenceSerial, item.sequenceSerial);
    doc.BPL_IDAssignedToInvoice = this.numberValue(
      item.BPL_IDAssignedToInvoice,
      item.bpl_IDAssignedToInvoice,
      item.BPLID,
      item.BPLId,
      item.BplId,
      item.Bplid,
      item.bplid
    );
    doc.BPLName = this.stringValue(
      item.BPLName,
      item.BPLNameAssignedToInvoice,
      item.BplName,
      item.Bplname,
      item.bplName,
      item.bplname
    );
    doc.SlpName = this.stringValue(item.SlpName, item.slpName, item.SalesEmployeeName, item.salesEmployeeName);
    doc.DocObjectCode = this.config.docObjectCode;

    if (this.config.kind === 'recebimento') {
      doc.DocumentStatus = doc.DocumentStatus || 'bost_Close';
      doc.DocumentLines = [];
      doc.DocumentAdditionalExpenses = [];
    }

    return doc;
  }

  private mapLines(lines: any[]): DocumentLines[] {
    return (lines || []).map((item) => {
      const linha = new DocumentLines();
      linha.ItemCode = this.stringValue(item.ItemCode, item.itemCode);
      linha.ItemDescription = this.stringValue(item.ItemDescription, item.itemDescription, item.Dscription, item.dscription);
      linha.Quantity = this.numberValue(item.Quantity, item.quantity);
      linha.UnitPrice = this.numberValue(item.UnitPrice, item.unitPrice, item.PrecoNegociado, item.precoNegociado);
      linha.LineTotal = this.numberValue(item.LineTotal, item.lineTotal, linha.Quantity * linha.UnitPrice);
      linha.SalesPersonCode = this.optionalNumberValue(item.SalesPersonCode, item.salesPersonCode, item.SlpCode, item.slpCode);
      return linha;
    });
  }

  private mapExpenses(expenses: any[]): Array<{ LineTotal: number }> {
    return (expenses || []).map((item) => ({
      LineTotal: this.numberValue(item.LineTotal, item.lineTotal)
    }));
  }

  private mapInstallments(installments: any[]): DocumentInstallment[] {
    return (installments || []).map((item) => Object.assign(new DocumentInstallment(), {
      ...item,
      InstallmentId: this.numberValue(item.InstallmentId, item.installmentId),
      DueDate: this.stringValue(item.DueDate, item.dueDate),
      total: this.numberValue(item.total, item.Total),
      Total: this.numberValue(item.Total, item.total),
      Percentage: this.stringValue(item.Percentage, item.percentage),
      Status: this.stringValue(item.Status, item.status),
      U_pix_reference: this.stringValue(item.U_pix_reference, item.u_pix_reference),
    }));
  }

  private numberValue(...values: any[]): number {
    const value = values.find((it) => it !== undefined && it !== null && it !== '');
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private optionalNumberValue(...values: any[]): number | null {
    const value = values.find((it) => it !== undefined && it !== null && it !== '');
    if(value === undefined || value === null)
      return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private stringValue(...values: any[]): string {
    const value = values.find((it) => it !== undefined && it !== null && it !== '');
    return value != null ? String(value) : '';
  }
}
