import { BatchStock } from "../../sap-shared/_models/BatchStock.model";


export class Reprocessamento{
    
    itemCode : string
    quantidade : number
    deposito : string
    itemCodeTarget : string
    lotes : Array<any>

    constructor(
        itemCode : string,
        quantidade : number,
        deposito : string,
        itemCodeTarget : string,
        lotes : Array<BatchStock>){
            this.itemCode = itemCode
            this.quantidade = quantidade
            this.deposito = deposito
            this.itemCodeTarget = itemCodeTarget
            this.lotes = lotes.map(it => this.toDto(it))
    }

    private toDto(b: BatchStock) {
        // pick apenas o que o backend entende
        const { DistNumber, ExpDate, InDate, ItemCode,
                ItemName, MnfDate, Quantity, WhsCode } = b;
      
        // devolve ambos os campos: DistNumber e BatchNumber (cópia do DistNumber)
        return {
          DistNumber,
          BatchNumber: DistNumber,
          ExpDate,
          InDate,
          ItemCode,
          ItemName,
          MnfDate,
          Quantity,
          WhsCode
        };
      }

}