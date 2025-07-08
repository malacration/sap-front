import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { BatchStock } from '../../../sap-shared/_models/BatchStock.model';
import { ReprocessamentoService } from '../../_services/reprocessamento.service';
import { Reprocessamento } from '../../_model/reprocessamento';

@Component({
  selector: 'selecao-produto-calc',
  templateUrl: './repreocessamento.component.html',
})
export class ReprocessamentoComponent {
  
  codProdutoAcabado : string = ""
  quantidade : number = 0
  codDeposito : string = ""
  codImtermediario: string = ""
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
        this.clear()
      },
      complete : () => {
        this.loading = false
      }
    })
  }

  clear(){
    this.codProdutoAcabado = ""
    this.quantidade = 0
    this.codDeposito = ""
    this.codImtermediario = ""
  }
}


