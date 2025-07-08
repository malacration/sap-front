import { Column } from "../../../shared/components/table/column.model"

export class LocalidadeDefinition{

    getDefinition() {
        return [
            new Column('Id', 'Code'),
            new Column('Name', 'Name'),
        ]   
    }
}
