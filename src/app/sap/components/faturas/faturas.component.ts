import { Component, OnInit } from '@angular/core';
import { FaturasService } from '../../service/fatura/faturas.service';
import { ActionReturn } from '../../../shared/components/action/action.model';
import { Fatura, FaturaDefinition } from '../../model/fatura/fatura.model';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { Page } from '../../model/page.model';
import { AlertSerice } from '../../service/alert.service';
import { RadioItem } from '../form/radio/radio.model';
import { OneTimePasswordService } from '../../service/one-time-password.service';
import { ConfigService } from '../../../core/services/config.service';
import { BusinessPartner } from '../../model/business-partner/business-partner';



@Component({
  selector: 'app-faturas',
  templateUrl: './faturas.component.html',
  styleUrls: ['./faturas.component.scss']
  
})
export class FaturasComponent implements OnInit {
  
  finalizado = false;
  faturas : Page<Fatura> = new Page();
  faturaSelecionada : any;
  clienteSelecionado : BusinessPartner;
  cpfCnpjInput : any;
  loading = false;
  definition = new FaturaDefinition().getFaturaDefinition();
  disableAvancar : boolean = false
  contatosOpcoes : Array<RadioItem>

  phoneNumber = this.configService.commercial_phone

  constructor(private faturaService : FaturasService,
    private otpService : OneTimePasswordService,
    private configService :  ConfigService,
    private alertService : AlertSerice,
    private bpService : BusinessPartnerService){
      
  }

  ngOnInit(){
    if(localStorage.getItem("token")){
      this.getCurrentBp()
    }
  }

  buscarContatos(){
    this.disableAvancar=true
    this.bpService.getContactsOpaco(this.cpfCnpjInput)
    .subscribe({
      next: (it) => {
        this.disableAvancar=false
        let i = -1
        this.contatosOpcoes = it.map( c => new RadioItem(c.contato,i++))
      }, error: (err) => {
        this.disableAvancar=false
        console.log(err)
      }
    });
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

  recebeCodigo(codigo){
    this.otpService.loginOtp(this.cpfCnpjInput,codigo).subscribe({next: (it) => {
        localStorage.setItem("token",it)
        this.getCurrentBp()
      },
      error : (err) => {
        this.alertService.error("Codigo invalido")
      }
    })
  }

  getCurrentBp(){
    this.loading = true
    this.bpService.getByCurrentUser().subscribe((cliente) => {
      this.clienteSelecionado = cliente;
      this.loading = false
      this.loadFaturas();
    })
  }

  close(){
    this.contatosOpcoes = undefined
    this.faturaSelecionada = undefined;
    this.clienteSelecionado = undefined;
  }


}
