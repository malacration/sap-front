import { Column } from "../../../shared/components/table/column.model"

export class SalesPersonDefinition{

    //actionHtml = `<a class="btn btn-primary" (click)="selecionaFatura()"><i class="fas fa-eye"></i> Ver</a>`

    getDefinition() {
        return [
            new Column('Id', 'SlpCode'),
            new Column('Nome', 'SlpName'),
        ]   
    }
}