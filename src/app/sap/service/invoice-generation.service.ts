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
        UnitPrice: '987826', // Note que agora é string para compatibilidade
        WarehouseCode: '502.06',
        Usage: '9',
        TaxCode: '5101-021',
        CostingCode: '500',
        CostingCode2: "50000201",
        BaseType: 17,
        BaseEntry: 94068,
        BaseLine: 0,
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
        BPL_IDAssignedToInvoice: '11',
        Comments: `Nota fiscal gerada a partir da ordem de carregamento ${loadingOrder.DocEntry}`,
        U_id_pedido_forca: loadingOrder.DocEntry.toString(),
    };
}
}