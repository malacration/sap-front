import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Fatura, FaturaDefinition } from '../../../model/fatura/fatura.model';
import { FaturasService } from '../../../service/fatura/faturas.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { BusinessPartner } from '../../../model/business-partner';
import { Page } from '../../../model/page.model';



@Component({
  selector: 'app-lista-fatura',
  templateUrl: './lista-fatura.component.html',
})
export class ListaFaturaComponent implements OnInit {
  

  finalizado = false;
  faturas : Page<Fatura> = new Page();
  faturaSelecionada : any;
  
  @Input()
  clienteSelecionado : BusinessPartner;
  
  @Output() 
  closeEvent = new EventEmitter();

  cpfCnpjInput : any;
  loading = false;
  definition = new FaturaDefinition().getFaturaDefinition();

  constructor(private faturaService : FaturasService){
      
  }

  ngOnInit(page = 0){
    this.loadFaturas(page)
  }

  loadFaturas(page){
    this.loading = true;
    this.faturaService.getFaturas(this.clienteSelecionado.CardCode,page).subscribe((faturas) => {
      this.faturas = faturas;
      this.loading = false;
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

  close(){
    localStorage.removeItem("token")
    this.closeEvent.emit()
  }

}
