import { Observable } from "rxjs";
import { PedidoVenda } from "../../components/document/documento.statement.component";

export interface DocumentAngularSave{

    save(body : PedidoVenda) : Observable<any>
}