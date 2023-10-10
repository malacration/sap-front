import { Component } from '@angular/core';
import Stepper from 'bs-stepper';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { BPAddress, BusinessPartner } from '../../model/business-partner';
import { AlertSerice } from '../../service/alert.service';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
})
export class CadastroComponent {

  private stepper: Stepper;

  loading : boolean = true;
  finalizado = false

  isPessoaFisica : boolean = true

  pn : BusinessPartner = new BusinessPartner()

  enderecoSelecionado : BPAddress

  next() {
    this.stepper.next();
  }

  nameNewsAddress : string
  novoEndereco(){
    if(this.nameNewsAddress && this.nameNewsAddress != ''){
      let address = new BPAddress(this.nameNewsAddress)
      address.BPCode = this.pn.CardCode;
      address.RowNum = this.pn.BPAddresses.reduce((a,b) => a.RowNum > b.RowNum ? a : b).RowNum + 1
      this.pn.BPAddresses.push(address)
      this.nameNewsAddress = null
      //last array
      this.enderecoSelecionado = this.pn.BPAddresses.slice(-1)[0]
    }
  }

  onSubmit(){
    this.loading = true;
    this.pnService.save('windson',this.pn).subscribe( data => {
      this.alert.info('Cadastro atualizdo com sucesso').then(( ) => this.finalizado = true)  
    })
  }

  selecionaEndereco($event){
    this.enderecoSelecionado = this.pn.getAddressesByAddressName($event)
  }

  constructor(private pnService: BusinessPartnerService, private alert : AlertSerice){
  }

  ngOnInit(): void {
    this.loading = true;
    this.pnService.getByUpdate('CLI0000001').subscribe(pn => {
      this.pn = pn
      this.loading = false;
    })
  }

}
