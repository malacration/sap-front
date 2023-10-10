import { Option } from "./form/option"


export class BusinessPartner{
    CardCode : string
    CardName : string
    Phone1 : Number
    Phone2 : Number
    U_Rov_Data_Nascimento : Date
    EmailAddress : String


    estadoCivil : string = null
    U_Rov_Nome_Mae : string

    BPAddresses : Array<BPAddress> = new Array()

    getAddressOptions() : Array<Option>{
        return this.BPAddresses.map(it => new Option(it.AddressName , it.AddressName))
    }

    getAddressesByAddressName(addressName : string) : BPAddress{
        return this.BPAddresses.find(it => it.AddressName == addressName)
    }
    
}

export class BPAddress{
    AddressName : string
    AddressType : string = ''
    Street : string
    State : string
    County : string
    ZipCode : string
    Block : string
    StreetNo : string
    BuildingFloorRoom : string
    BPCode : string
    RowNum : number;

    constructor(addressName : string){
        this.AddressName = addressName
    }
}