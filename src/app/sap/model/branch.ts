import { Column } from "../../shared/components/table/column.model"


export class Branch{
    Bplid : string
    Bplname : string
    prefState: string

    getDefinition() {
        return [
            new Column('Id', 'Bplid'),
            new Column('Nome', 'Bplname')
        ]   
    }
}