export interface Actiable{

    getActions() : Array<Action>
  
}

export class Action{

  label : string
  icon : string
  retorno : ActionReturn

  constructor(label : string, retorno : ActionReturn, icon : string = null){
    this.label = label
    this.icon = icon
    this.retorno = retorno
  }
  
}


export class ActionReturn{

  type : string
  data : any

  constructor(type : string, data : any){
    this.type = type
    this.data = data
  }
  
}