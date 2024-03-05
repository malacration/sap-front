import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Fatura, FaturaDefinition } from '../../../model/fatura/fatura.model';
import { FaturasService } from '../../../service/fatura/faturas.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { BusinessPartner } from '../../../model/business-partner';
import { Page } from '../../../model/page.model';
import { TaxService } from '../../../service/fatura/tax.service';
import { error } from 'console';



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


  filter = {
    numeroNf : null,
    dataInicial : null,
    dataFinal : null,
    filial : null
  }

  constructor(private faturaService : FaturasService,
    private taxService : TaxService){
      
  }

  ngOnInit(page = 0){
    this.loadFaturas(page)
  }

  loadFaturas(page){
    this.loading = true;
    this.faturaService.getFaturas(this.clienteSelecionado.CardCode,page,this.filter).subscribe((faturas) => {
      this.faturas = faturas;
      this.loading = false;
    },error => {this.loading = false})
  }

  selecionaFatura($event){
    this.faturaSelecionada = $event;
  }

  descelecionarFatura($event){
    this.faturaSelecionada = undefined;
  }

  changeNumeroNf(numero){
    if(this.filter.numeroNf != numero){
      this.filter.numeroNf = numero
      this.loadFaturas(0)
    }
  }

  changeDatas(datas){
    if(datas.de != this.filter.dataInicial || datas.ate != this.filter.dataFinal){
      this.filter.dataInicial = datas.de
      this.filter.dataFinal = datas.ate
      this.loadFaturas(0)
    }
  }

  action(event : ActionReturn){
    if(event.type == "ver-fatura"){
      this.faturaSelecionada = event.data
      event.carregando = false
    }
    else if(event.type == "show-nf"){
      event.carregando = true
      this.taxService.getPdf(event.data.docEntry).subscribe({
        next: (response) => {
          var fileURL = window.URL.createObjectURL(response);                        
          window.open(fileURL, '_blank');
        },
        complete : () => event.carregando = false,
        error : () => event.carregando = false,
      })
    }
    else if(event.type == "show-boleto"){
      event.carregando = true;
      this.faturaService.getPdf(event.data.docEntry,"0").subscribe({
        next: (response) => {
          var fileURL = window.URL.createObjectURL(response);                        
          window.open(fileURL, '_blank');
        },
        complete : () => event.carregando = false,
        error : () => event.carregando = false,
      })
    }
  }

  close(){
    localStorage.removeItem("token")
    this.closeEvent.emit()
  }

}
