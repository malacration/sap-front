import { Route } from "@angular/router"

export class MenuItem{
    name : string
    iconClasses : string = 'fas fa-file'
    path : Array<string>
    children : Array<MenuItem> = new Array()
    // componente

    constructor(route : Route,pai){
        this.name = route.title.toString()
        // this.componente = route.component
        this.path = [pai,route.path]
        console.log(route.data)
        let icon = route?.data?.filter(item => item.startswith("icon:")).string.split(':')[0]
        if(icon)
            icon = this.iconClasses
    }
}