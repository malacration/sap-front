import { Route } from "@angular/router"

export class MenuItem{
    name : string
    iconClasses : string = 'fas fa-file'
    path : Array<string>
    children : Array<MenuItem>

    constructor(route : Route){
        this.name = route.title.toString()
        this.path = [route.path]
        
    }
}