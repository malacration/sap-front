

export class BusinessPlace{
    Bplid : number
    Bplname : string
    DefaultCustomerID: string
    DefaultVendorID: string
    DefaultWarehouseID : string

    constructor(
        Bplid : number, 
        Bplname : string, 
        DefaultCustomerID: string, 
        DefaultVendorID: string, 
        DefaultWarehouseID : string){
            
            this.Bplid = Bplid
            this.Bplname = Bplname
            this.DefaultCustomerID = DefaultCustomerID
            this.DefaultVendorID = DefaultVendorID
            this.DefaultWarehouseID = DefaultWarehouseID
    }
}