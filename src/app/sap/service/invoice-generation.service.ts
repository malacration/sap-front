import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../core/services/config.service';
import { Observable } from 'rxjs';
import { OrdemCarregamento } from '../model/ordem-carregamento';

@Injectable({
  providedIn: 'root'
})
export class InvoiceGenerationService {
  private url = "http://localhost:8080/invoice";

  constructor(private config: ConfigService, private http: HttpClient) {
    this.url = config.getHost() + "/invoice";
  }

  generateInvoiceFromLoadingOrder(loadingOrder: OrdemCarregamento): Observable<any> {
    const invoiceData = this.transformLoadingOrderToInvoice(loadingOrder);
    
    return this.http.post(`${this.url}/criar`, invoiceData);
  }

private transformLoadingOrderToInvoice(loadingOrder: OrdemCarregamento): any {
    const currentDate = new Date().toISOString().split('T')[0];

    const documentLines = loadingOrder.ORD_CRG_LINHACollection.map(item => ({
        ItemCode: item.U_itemCode,
        Quantity: item.U_quantidade,
        UnitPrice: item.U_precoUnitario, 
        WarehouseCode: item.U_codigoDeposito,
        Usage: item.U_usage,
        TaxCode: item.U_taxCode,
        CostingCode: item.U_costingCode,
        CostingCode2: item.U_costingCode2,
        BaseType: 17,
        BaseEntry: item.U_orderDocEntry,
        BaseLine: item.U_baseLine,
        U_description: item.U_description,
        BatchNumbers: item.U_batchNumbers?.map(batch => ({
            BatchNumber: batch.BatchNumber || "QMG005116", // Usa o batch da ordem ou um default
            Quantity: batch.Quantity || 1,
            ItemCode: batch.ItemCode || item.U_itemCode // Usa o itemCode do batch ou o principal
        })) || [{
            BatchNumber: "QMG005116",
            Quantity: 2,
            ItemCode: item.U_itemCode
        }] // Default se não houver batches
    }));

    return {
        CardCode: loadingOrder.ORD_CRG_LINHACollection[0]?.U_cardCode || '',
        DocDueDate: currentDate,
        DocumentLines: documentLines,
        BPL_IDAssignedToInvoice: '2',
        Comments: `Nota fiscal gerada a partir da ordem de carregamento ${loadingOrder.DocEntry}`,
        U_id_pedido_forca: loadingOrder.DocEntry.toString(),
    };
}
}