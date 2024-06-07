import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { City } from "../adressess/city"
import { Option } from "../form/option"


export class SalesPerson implements Actiable{
    SlpCode : Number
    SlpName : string

    constructor(){

    }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-check-circle")
        ]
    }

    toString(){
        return this.SlpName
    }
        
}
