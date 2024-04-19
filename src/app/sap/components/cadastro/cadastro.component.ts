import { Component, OnInit } from '@angular/core';
import { BusinessPartnerService } from '../../service/business-partners.service';
import { AlertSerice } from '../../service/alert.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store/state';
import { ToggleHeaderMenu } from '../../../store/ui/actions';
import { Observable, concatAll, delay, forkJoin, from, map, merge, of, reduce, subscribeOn, switchMap, timer } from 'rxjs';
import { BPAddress, BusinessPartner, Person, Referencia } from '../../model/business-partner/business-partner';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
})
export class CadastroComponent implements OnInit {

  loading: boolean = true;
  finalizado = false

  isPessoaFisica: boolean = true

  pn: BusinessPartner = new BusinessPartner()

  enderecoSelecionado: BPAddress

  hash: string

  files: Array<any> = [];

  getFiles(files) {
    this.files = files
  }
  
  isCasado(): boolean {
    let conjugue = this.pn.getConjugue()
    return (conjugue != undefined && conjugue != null)
  }

  changeEstadoCivil($event) {
    const element = $event.currentTarget as HTMLSelectElement
    const value = element.value

    if (value == 'solteiro') {
      this.pn.RemoveContacts.push(this.pn.getConjugue().InternalCode)
      this.pn.ContactEmployees = this.pn.ContactEmployees.filter(it => it.U_tipoPessoa != 'conjuge')
    }
    else if (value == 'casado' && !this.isCasado()) {
      let conjuge = new Person();
      conjuge.CardCode = this.pn.CardCode;
      conjuge.U_tipoPessoa = 'conjuge';
      this.pn.ContactEmployees.push(conjuge)
    }

  }

  nameNewsAddress: string
  
  novoEndereco() {
    if (this.nameNewsAddress && this.nameNewsAddress != '') {
      let address = new BPAddress(this.nameNewsAddress)
      address.BPCode = this.pn.CardCode;
      address.RowNum = this.pn.BPAddresses.reduce((a, b) => a.RowNum > b.RowNum ? a : b).RowNum + 1
      this.pn.BPAddresses.push(address)
      this.nameNewsAddress = null
      this.enderecoSelecionado = this.pn.BPAddresses.slice(-1)[0]
    }
  }

  onSubmit() {
    let subiscribers = Array<Observable<any>>();
    
    if (this.files.length > 0) {
      this.files.forEach(file => {
        subiscribers.push(this.pnService.attachment(this.hash, file))
      });
    }

    subiscribers.push(of(delay(1000)))
    const data$ = from(subiscribers).pipe(
      concatAll()
    );
    
    this.loading = true
    data$.pipe( 
      switchMap(it => this.pnService.save(this.hash,this.pn).pipe(
        map(() => {
          this.alert.info('Cadastro atualizdo com sucesso').then(() => {
            this.finalizado = true
            window.close()
          })}
        )
      ))
    ).subscribe()
  }

  selecionaEndereco($event) {
    this.enderecoSelecionado = this.pn.getAddressesByAddressName($event)
  }

  referenciaSelecionada: Referencia

  selecionaReferencia($event) {
    this.referenciaSelecionada = this.pn.Referencias.REFERENCIACollection.find(it => it.LineId == $event)
  }

  novaReferencia() {
    let lineNum = this.pn.Referencias.REFERENCIACollection.length + 1
    this.pn.Referencias.REFERENCIACollection.push(new Referencia(this.pn.CardCode, lineNum))
    this.referenciaSelecionada = this.pn.Referencias.REFERENCIACollection.slice(-1)[0]
  }

  constructor(private pnService: BusinessPartnerService,
    private alert: AlertSerice,
    private store: Store<AppState>,
    private route: ActivatedRoute) {
  }

  ngOnInit(): void {
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
