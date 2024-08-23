import { Route } from "@angular/router"

export class MenuItem{
    name : string
    iconClasses : string = 'fas fa-file'
    path : Array<string>
    children : Array<MenuItem> = new Array()
    // componente

    constructor(route : Route,pai){
        this.name = route.title.toString()
        this.path = [pai,route.path]
        let icon = route?.data
        ?.filter(item => item.startsWith("icon:"))
            ?.toString()?.split(':')
        if(icon != null && icon != undefined){
            this.iconClasses = icon[1]
        }
    }
}