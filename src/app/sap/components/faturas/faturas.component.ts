import { Component, OnInit } from '@angular/core';
import { FaturasService } from '../../service/fatura/faturas.service';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { Fatura, FaturaDefinition } from '../../model/fatura/fatura.model';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { BusinessPartner } from '../../model/business-partner';
import { Page } from '../../model/page.model';



@Component({
  selector: 'app-faturas',
  templateUrl: './faturas.component.html',
  styleUrls: ['./faturas.component.scss']
  
})
export class FaturasComponent {
  
  finalizado = false;
  faturas : Page<Fatura> = new Page();
  faturaSelecionada : any;
  clienteSelecionado : BusinessPartner;
  cpfCnpjInput : any;
  loading = false;
  definition = new FaturaDefinition().getFaturaDefinition();

  constructor(private faturaService : FaturasService,
    private bpService : BusinessPartnerService){
      
  }

  buscar(){
    this.bpService.getByCpfCnpj(this.cpfCnpjInput).subscribe((cliente) => {
      this.clienteSelecionado = cliente;
      this.loadFaturas();
    })
  }

  loadFaturas(page = 0){
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
    this.faturaSelecionada = undefined;
    this.clienteSelecionado = undefined;
  }


}
