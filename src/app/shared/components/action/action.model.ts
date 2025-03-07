import { BootstrapColor } from "../../bootstrap-color"

export interface Actiable{

    getActions() : Array<Action>
  
}

export class Action{

  label : string
  icon : string
  retorno : ActionReturn
  color : BootstrapColor

  constructor(label : string, retorno : ActionReturn, icon : string = null, color : BootstrapColor = 'primary'){
    this.label = label
    this.icon = icon
    this.retorno = retorno
    this.color = color
  }
}


export class ActionReturn{

  type : string
  data : any
  carregando : boolean = false
  
  constructor(type : string, data : any){
    this.type = type
    this.data = data
  }
  
}