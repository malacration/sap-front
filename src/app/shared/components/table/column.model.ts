
export class Column {
  label : string
  property : string
  html : string = null
  sticky = false
  
  constructor(label : string, property : string, html : string = null, sticky : boolean = false){
    this.label = label
    this.property = property
    this.html = html
    this.sticky = sticky
  }
} 