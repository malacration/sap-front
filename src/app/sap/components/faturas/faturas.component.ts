import { Component, OnInit } from '@angular/core';
import { FaturasService } from '../../service/fatura/faturas.service';



@Component({
  selector: 'app-faturas',
  templateUrl: './faturas.component.html',
})
export class FaturasComponent implements OnInit {
  

  faturas : Array<string> = ["1","2"]
  
  faturaSelecionada : any;

  constructor(private faturaService : FaturasService){
      
  }

  ngOnInit(): void {
    this.faturaService.getFaturas().subscribe((faturas) => {
      this.faturas = faturas;
    })
  }

  selecionaFatura($event){
    this.faturaSelecionada = $event;
    console.log($event)
  }

  descelecionarFatura($event){
    this.faturaSelecionada = undefined;
  }


}
