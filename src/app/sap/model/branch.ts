import { Column } from "../../shared/components/table/column.model"


export class Branch{
    bplid : string
    bplname : string

    getDefinition() {
        return [
            new Column('Id', 'bplid'),
            new Column('Nome', 'bplname')
        ]   
    }
}