import { Component, OnInit } from '@angular/core';
import Stepper from 'bs-stepper';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { BPAddress, BusinessPartner, Person, Referencia, ReferenciaComercial } from '../../model/business-partner';
import { AlertSerice } from '../../service/alert.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store/state';
import { uiReducer } from '../../../store/ui/reducer';
import { ToggleControlSidebar, ToggleDarkMode, ToggleHeaderMenu } from '../../../store/ui/actions';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
})
export class CadastroComponent implements OnInit{

  private stepper: Stepper;

  loading : boolean = true;
  finalizado = false

  isPessoaFisica : boolean = true

  pn : BusinessPartner = new BusinessPartner()

  enderecoSelecionado : BPAddress

  hash : string

  next() {
    this.stepper.next();
  }

  isCasado() : boolean{
    let conjugue = this.pn.getConjugue()
    return (conjugue != undefined && conjugue != null)
  }

  changeEstadoCivil($event){
    const element = $event.currentTarget as HTMLInputElement
    const value = element.value

    if(value == 'solteiro'){
      this.pn.RemoveContacts.push(this.pn.getConjugue().InternalCode)
      this.pn.ContactEmployees = this.pn.ContactEmployees.filter(it => it.U_tipoPessoa != 'conjuge') 
    }
    else if(value == 'casado' && !this.isCasado()){
      let conjuge = new Person();
      conjuge.CardCode = this.pn.CardCode;
      conjuge.U_tipoPessoa = 'conjuge';
      this.pn.ContactEmployees.push(conjuge)
    }
    
  }

  nameNewsAddress : string
  novoEndereco(){
    if(this.nameNewsAddress && this.nameNewsAddress != ''){
      let address = new BPAddress(this.nameNewsAddress)
      address.BPCode = this.pn.CardCode;
      address.RowNum = this.pn.BPAddresses.reduce((a,b) => a.RowNum > b.RowNum ? a : b).RowNum + 1
      this.pn.BPAddresses.push(address)
      this.nameNewsAddress = null
      this.enderecoSelecionado = this.pn.BPAddresses.slice(-1)[0]
    }
  }

  onSubmit(){
    this.loading = true;
    this.pnService.save(this.hash,this.pn).subscribe( data => {
      this.alert.info('Cadastro atualizdo com sucesso').then(( ) => {
        this.finalizado = true
        window.close()
      })
    }, error => {
      this.loading = false;
    })
  }

  selecionaEndereco($event){
    this.enderecoSelecionado = this.pn.getAddressesByAddressName($event)
  }

  referenciaSelecionada : Referencia

  selecionaReferencia($event){
    this.referenciaSelecionada = this.pn.Referencias.REFERENCIACollection.find(it => it.LineId == $event)
  }

  novaReferencia(){
    let lineNum = this.pn.Referencias.REFERENCIACollection.length+1
    this.pn.Referencias.REFERENCIACollection.push(new Referencia(this.pn.CardCode,lineNum))
    this.referenciaSelecionada = this.pn.Referencias.REFERENCIACollection.slice(-1)[0]
  }

  constructor(private pnService: BusinessPartnerService, 
    private alert : AlertSerice,
    private store: Store<AppState>,
    private route: ActivatedRoute){
  }

  ngOnInit(): void {
    this.store.dispatch(new ToggleHeaderMenu());
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.hash = params.get('id')
      this.pnService.getByUpdate(this.hash).subscribe(pn => {
        this.pn = pn
        this.loading = false;
      })
    })
    this.loading = true;
  }

}