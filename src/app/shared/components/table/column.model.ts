export class Column {
  label: string;
  property: string;
  html: string | null = null;
  isLink: boolean = false;

  constructor(label: string, property: string, html: string = null, isLink: boolean = false) {
    this.label = label;
    this.property = property;
    this.html = html;
    this.isLink = isLink;
  }
}