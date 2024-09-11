import { Observable, Subscribable, map, of } from "rxjs";
import { DocumentService } from "../../components/marketing-document/core/documento.service";
import { Page } from "../../model/page.model";
import { DocumentList } from "../../model/markting/document-list";
import { Column } from "../../../shared/components/table/column.model";
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ConfigService } from "../../../core/services/config.service";

@Injectable({
    providedIn: 'root'
  })
export class CotacaoService implements DocumentService{

    url = "http://localhost:8080/quotation"

    constructor(private config : ConfigService, private hppCliente : HttpClient){
        this.url = config.getHost()+"/quotation"
    }
    
    getDefinition(): Column[] {
        return [
            new Column('ID', 'DocNum'),
            new Column('Código do Cliente', 'CardCode'),
            new Column('Nome', 'CardName'),
            new Column('Produtos', 'produtosCurrency'),
            new Column('Frete', 'freteCurrency'),
            new Column('Valor Total', 'totalCurrency'),
            new Column('Criado em', 'dataCriacao'),
            new Column('Status', 'situacao'),
        ];
    }
    
    
    get(pagina : number): Observable<Page<DocumentList>> {
        return this.hppCliente
            .get<Page<DocumentList>>(this.url+"?page="+pagina+"&size=20")
            .pipe(map((f) => { 
                f.content = f.content.map((ff) => {
                    return Object.assign(new DocumentList(),ff)
                })
                return f
            }))
        // let documento = new DocumentList("Cotacao Service mock");
        // let page = new Page<DocumentList>();
        // page.totalElements = 1
        // page.size = 20
        // page.content = [documento]
        // return of(page)
    }

    

}