
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