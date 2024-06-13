import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"


export class SalesPerson implements Actiable{
    SalesEmployeeCode : Number
    SalesEmployeeName : String

    constructor(){

    }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-check-circle")
        ]
    }

    toString(){
        return this.SalesEmployeeName
    }
        
}
