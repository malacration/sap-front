import { Actiable, Action, ActionReturn } from "../../../shared/components/action/action.model"
import { City } from "../adressess/city"
import { Option } from "../form/option"


export class BusinessPartner implements Actiable{
    CardCode : string
    CardName : string
    Phone1 : Number
    Phone2 : Number
    Series : number
    U_Rov_Data_Nascimento : Date
    EmailAddress : String
    U_Rov_Nome_Mae : string
    BPAddresses : Array<BPAddress> = new Array()
    ContactEmployees : Array<Person> = new Array()
    RemoveContacts : Array<number> = new Array()
    Referencias : ReferenciaComercial

    private _addressOptions
    private _referenceOptions
    
    CpfCnpjStr() {
        get : { return this.TaxId0 ? this.TaxId0 : this.TaxId4}
    }
    
    TaxId0 : String
    TaxId4 : String

    constructor(){

    }

    getAddressOptions(tipo = null) : Array<Option>{
        if(this._addressOptions)
            return this._addressOptions
        if(this.BPAddresses && this.BPAddresses.length > 0){
            this._addressOptions = this.BPAddresses
                .map(it => Object.assign(new BPAddress(null),it))
                .filter(it => tipo == null || it.AddressType == tipo)
                .map(it => new Option(it , it.toString()))
            return this._addressOptions
        }
        else
            return new Array()                
    }


    getReferenciaOptions() : Array<Option>{
        if(this._referenceOptions)
            return this._referenceOptions
        
        this.Referencias = Object.assign(new ReferenciaComercial(this.CardCode),this.Referencias)
        if(this.Referencias && this.Referencias.REFERENCIACollection && this.BPAddresses.length > 0){
            this._referenceOptions = this.Referencias.REFERENCIACollection
                .map(it => new Option(it.LineId , "Ref Nº "+it.LineId))
            return this._referenceOptions
        }else
            return new Array()
    }

    getAddressesByAddressName(addressName : BPAddress) : BPAddress{
        console.log("Busca: ", addressName.AddressName)
        console.log(this.BPAddresses)
        return this.BPAddresses.find(it => it.AddressName == addressName.AddressName)
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

    toString() : string{
        return this.Street+" | "+this.StreetNo+" | "+this.ZipCode
    }
}