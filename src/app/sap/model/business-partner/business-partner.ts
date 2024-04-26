import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { Option } from "../form/option"


export class BusinessPartner implements Actiable{
    CardCode : string
    CardName : string
    Phone1 : Number
    Phone2 : Number
    U_Rov_Data_Nascimento : Date
    EmailAddress : String
    U_Rov_Nome_Mae : string
    BPAddresses : Array<BPAddress> = new Array()
    ContactEmployees : Array<Person> = new Array()
    RemoveContacts : Array<number> = new Array()
    Referencias : ReferenciaComercial
    
    CpfCnpjStr() {
        get : { return this.TaxId0 ? this.TaxId0 : this.TaxId4}
    }
    
    TaxId0 : String
    TaxId4 : String

    constructor(){
        console.log("Criando obj")
    }

    getAddressOptions() : Array<Option>{
        return this.BPAddresses.map(it => new Option(it.AddressName , it.AddressName))
    }

    getReferenciaOptions() : Array<Option>{
        if(this.Referencias)
            return this.Referencias.REFERENCIACollection
            .map(it => new Option(it.LineId , "Ref Nº "+it.LineId))
        else
            return new Array()
    }

    getAddressesByAddressName(addressName : string) : BPAddress{
        return this.BPAddresses.find(it => it.AddressName == addressName)
    }

    getConjugue() : Person{
        return this.ContactEmployees.find(it => it.U_tipoPessoa == 'conjuge')
    }

    getActions(): Action[] {
        return [
            new Action("", new ActionReturn("selected",this), "far fa-check-circle")
        ]
    }

    toString(){
        return this.CardName
    }
    
}

export class ReferenciaComercial{
    Code : string
    U_cardCode : string

    REFERENCIACollection : Array<Referencia> = new Array()

    constructor(cardCode){
        this.Code = cardCode
        this.U_cardCode = cardCode
    }

}

export class Referencia{
    constructor(code, lineId){
        this.Code = code
        this.LineId = lineId
    }

    Code : string
    LineId : number
    U_nome : string
    U_telefone : string
    U_anotacao : string
}

export class Person{

    Name : string
    DateOfBirth : Date
    U_TX_IdFiscalAut : string
    U_tipoPessoa : string
    CardCode : string
    InternalCode : number
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