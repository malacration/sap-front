export class Filter {
    colum : any
    value : any

    constructor(colum : any, value : any){
        this.colum = colum
        this.value = value
    }

    getUrlFilter() : string {
        return this.colum+'='+this.value
    }
}