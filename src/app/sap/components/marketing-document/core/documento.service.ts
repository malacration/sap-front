import { Page } from "../../../model/page.model";
import { DocumentList } from "../../../model/markting/document-list";
import { Observable } from "rxjs";
import { Column } from "../../../../shared/components/table/column.model";

export interface DocumentService{
    get(pagina : number) : Observable<Page<DocumentList>>

    getDefinition() : Array<Column>
}