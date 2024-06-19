import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RadioItem } from '../../form/radio/radio.model';
import { AlertSerice } from '../../../service/alert.service';
import { CowntDown } from '../../../../core/cowntdown.module';
import { OneTimePasswordService } from '../../../service/one-time-password.service';



@Component({
  selector: 'app-auth-fatura',
  templateUrl: './autenticacao-fatura.component.html',
})
export class AutenticacaoFaturaComponent {

  constructor(private alertService : AlertSerice,
    private otpService : OneTimePasswordService){

  }

  count = new CowntDown()
  
  @Input()
  opcoes : Array<RadioItem>
  
  @Input()
  cpf : string

  selecionado : RadioItem
  aguardaCodeReturn : boolean = false
  codigo : number

  @Output() 
  getCodigo = new EventEmitter<number>();
  
  select($event){
    if(!($event instanceof Event)){
      this.selecionado = $event
    }
  }

  next(){
    this.otpService.generateOtpByContact(this.cpf,this.selecionado.label).subscribe(it =>{
    })
    this.alertService.info("Foi enviado uma mensagem").then(
      it => {
        this.count.timer(1)
        this.aguardaCodeReturn = true
      }
    )
  }

  acessaComCodigo(){
    this.getCodigo.emit(this.codigo)
  }

  reenviaDisable() : boolean{
    return this.count.getSec() > 0
  }
}
