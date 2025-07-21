import { formatCurrency } from "@angular/common"
import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { City } from "../adressess/city"
import { Option } from "../form/option"
import { RouteLink } from "../route-link"


export class Localidade implements Actiable{
    Code : string
    Name : string
    
    constructor(){

    }
    
    routerLink() : RouteLink{
        return new RouteLink(this.Code,"/clientes/parceiro-negocio/"+this.Code)
    }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-check-circle")
        ]
    }

    toString(){
        return this.Name
    }
    
}