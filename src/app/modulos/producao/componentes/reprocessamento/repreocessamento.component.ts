import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { BatchStock } from '../../../sap-shared/_models/BatchStock.model';
import { ReprocessamentoService } from '../../_services/reprocessamento.service';
import { Reprocessamento } from '../../_model/reprocessamento';

@Component({
  selector: 'selecao-produto-calc',
  templateUrl: './repreocessamento.component.html',
})
export class ReprocessamentoComponent {
  
  codProdutoAcabado : string = "PAC0000241"
  quantidade : number = 10
  codDeposito : string = "500.01"
  codImtermediario: string = "PDC0000029"
  loading = false

  lotes = undefined
  showLote = false

  constructor(private service : ReprocessamentoService){

  }

  selecionar(){
    this.showLote = true
  }

  lotesSelecionados(lotes : Array<BatchStock>){
    this.showLote = false
    this.loading = true
    let reprocessamento = new Reprocessamento(
      this.codProdutoAcabado,
      this.quantidade,
      this.codDeposito,
      this.codImtermediario,
       lotes)
    this.service.reprocesar(reprocessamento).subscribe({next : it => {
        this.loading = false
        this.codProdutoAcabado = ""
        this.quantidade = 0
        this.codDeposito = ""
        this.codImtermediario = ""
      },
      error: () => {
        
      },
      complete : () => {
        this.loading = false
      }
    })
  }
}


