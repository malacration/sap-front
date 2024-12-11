import { Column } from "../../../shared/components/table/column.model"

export class SalesPersonDefinition{

    getDefinition() {
        return [
            new Column('Id', 'SalesEmployeeCode'),
            new Column('Nome', 'SalesEmployeeName'),
        ]   
    }
}