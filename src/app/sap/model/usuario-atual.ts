export class VendedorVinculado {
    salesEmployeeCode : number
    salesEmployeeName : string
}

const ORIGEM_LABEL : { [origem : string] : string } = {
    SalePerson : 'Vendedor',
    EmployeesInfo : 'Funcionário',
    BusinessPartner : 'Cliente',
}

export class UsuarioAtual {
    id : string
    userName : string
    emailAddress : string
    origin : string
    bussinesPlace : Array<number> = []
    roles : Array<string> = []
    vendedor : VendedorVinculado = null

    get temVendedor() : boolean {
        return !!this.vendedor
    }

    origemLabel() : string {
        return ORIGEM_LABEL[this.origin] || this.origin
    }
}
