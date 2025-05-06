import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AlertService } from '../../../../sap/service/alert.service';

@Component({
  selector: 'selecao-produto-calc',
  templateUrl: './repreocessamento.component.html',
})
export class ReprocessamentoComponent implements OnInit {
  

  //TODO remover hard codes depois
  codProdutoAcabado : string = "PAC0000238"
  quantidade : number = 10
  codDeposito : string = "500.01"
  codImtermediario: string = "PDC0000029"


  loading = false

  constructor(){

  }

  ngOnInit(): void {

  }


  selecionar(){
    alert("selecionado")
  }
}


