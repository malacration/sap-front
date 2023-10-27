
export class Column {
  label : string
  property : string
  html : string = null
  
  constructor(label : string, property : string, html : string = null){
    this.label = label
    this.property = property
    this.html = html
  }
}


export interface Actiable{

  getActions() : Array<Action>

}


export class Action{

  label : string
  icon : string
  return : any

  constructor(label : string, return_ : any, icon : string = null){
    this.label = label
    this.icon = icon
    this.return = return_
  }

}

  