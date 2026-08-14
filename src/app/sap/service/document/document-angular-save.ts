import { Observable } from "rxjs";
import { PedidoVenda } from '../../model/document/pedido-venda.model';

export interface DocumentAngularSave{

    save(body : PedidoVenda) : Observable<any>
}