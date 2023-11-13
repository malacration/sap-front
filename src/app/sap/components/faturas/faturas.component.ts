import { Component, OnInit } from '@angular/core';
import { FaturasService } from '../../service/fatura/faturas.service';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { FaturaDefinition } from '../../model/fatura/fatura.model';



@Component({
  selector: 'app-faturas',
  templateUrl: './faturas.component.html',
  styleUrls: ['./faturas.component.scss']
  
})
export class FaturasComponent implements OnInit {
  

  faturas : Array<any>
  
  faturaSelecionada : any;
  
  definition = new FaturaDefinition().getFaturaDefinition();

  constructor(private faturaService : FaturasService){
      
  }

  ngOnInit(): void {
    this.faturaService.getFaturas().subscribe((faturas) => {
      this.faturas = faturas;
    })
  }

  selecionaFatura($event){
    this.faturaSelecionada = $event;
  }

  descelecionarFatura($event){
    this.faturaSelecionada = undefined;
  }


  action(event : ActionReturn){
    if(event.type == "ver-fatura"){
      this.faturaSelecionada = event.data
    }
  }


}
