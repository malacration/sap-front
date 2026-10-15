
export class Column {
  label : string
  property : string
  html : string = null
  sticky = false
  highlightNegative = false
  wrap = false
  clickable = false
  
  constructor(label : string, property : string, html : string = null, sticky : boolean = false,highlightNegative: boolean = false ){
    this.label = label
    this.property = property
    this.html = html
    this.sticky = sticky,
    this.highlightNegative = highlightNegative
  }

  withWrap() : Column {
    this.wrap = true
    return this
  }

  /** O valor vira link e o clique sai no (cellClick) da tabela. */
  withClick() : Column {
    this.clickable = true
    return this
  }
}
