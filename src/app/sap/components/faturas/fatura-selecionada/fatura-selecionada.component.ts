import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Parcela, ParcelaDefinition } from '../../../model/fatura/parcela.model';
import { Fatura } from '../../../model/fatura/fatura.model';
import { InstallmentService } from '../../../service/fatura/installment.service copy';
import { Paga } from '../../../model/fatura/paga.model';
import { FaturasService } from '../../../service/fatura/faturas.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';



@Component({
  selector: 'app-fatura-selecionada',
  templateUrl: './fatura-selecionada.component.html',
})
export class FaturaSelecionadaComponent implements OnInit {
  

  carregado = false;

  @Input()
  fatura: Fatura; 

  parcelas : Array<Parcela> = [];

  definition = new ParcelaDefinition().getFaturaDefinition();

  constructor(private service : InstallmentService, private faturaService : FaturasService){
  }

  @Output()
  close : EventEmitter<any> = new EventEmitter<any>();

  ngOnInit(): void {
    this.parcelas = this.fatura.parcelas
    this.service.getFaturaPaga(this.fatura.docEntry).subscribe((f) => {
      this.fatura.registraPagamento(f)
      this.carregado = true
    })
  }

  voltar($event){
    this.close.emit($event);
  }

  action(action : ActionReturn){
    if(action.type == 'ver-boleto'){
      action.carregando = true;
      this.faturaService.getPdf(this.fatura.docEntry,action.data.id).subscribe((response) => {
        action.carregando = false;
        var fileURL = window.URL.createObjectURL(response);                        
        window.open(fileURL, '_blank');
      })
    }
  }

}
