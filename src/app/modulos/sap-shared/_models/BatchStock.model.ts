
export class BatchStock {
  "DistNumber": string;
  "ExpDate": string | null;
  "InDate": string;
  "ItemCode": string;
  "ItemName": string;
  "MnfDate": string;
  "Quantity": number;
  "WhsCode": string;

  constructor(data? : {
    DistNumber: string;
    ExpDate: string | null;
    InDate: string;
    ItemCode: string;
    ItemName: string;
    MnfDate: string;
    Quantity: number;
    WhsCode: string;
  }) {
    if(data){
      this["DistNumber"] = data.DistNumber;
      this["ExpDate"] = data.ExpDate;
      this["InDate"] = data.InDate;
      this["ItemCode"] = data.ItemCode;
      this["ItemName"] = data.ItemName;
      this["MnfDate"] = data.MnfDate;
      this["Quantity"] = data.Quantity;
      this["WhsCode"] = data.WhsCode;
    }
  }

  getFormattedInDate(): string | null {
    return this.formatDate(this["InDate"]);
  }

  quantitySelecionadaEditable: number = null
  //TODO , precisa resolver o bug visual do table pois fica internamente o valor correto mas na tela fica o valor digitado
  // private _quantitySelecionada = 0

  // get quantitySelecionadaEditable() : number{
  //   return this._quantitySelecionada
  // }

  // set quantitySelecionadaEditable(valor){
  //   console.log("windson")
  //   if(valor > this.Quantity)
  //     this._quantitySelecionada = this.Quantity
  //   else
  //     this._quantitySelecionada = valor
  // }

  private formatDate(dateStr: string | null): string | null {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
}