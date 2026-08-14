import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Option } from '../../../model/form/option';
import { BPAddress } from '../../../model/business-partner/business-partner';
import { LocalidadeService } from '../../../../modulos/sap-shared/_services/localidade.service';
import { LocalidadeSearchComponent } from '../../../../modulos/sap-shared/componentes/localidade-search/localidade-search.component';
import { Localidade } from '../../../model/localidade/localidade';

@Component({
  selector: 'app-endereco',
  templateUrl: './endereco.component.html',
})
export class EnderecoComponent implements OnChanges {

  constructor(private ref: ChangeDetectorRef,
              private localidadeService: LocalidadeService){

  }

  @Input()
  endereco : BPAddress

  //quando true o campo de localidade aparece para qualquer tipo de endereco
  @Input()
  localidadeSempreVisivel = false

  @ViewChild('localidadeSearch') localidadeSearch : LocalidadeSearchComponent

  localidadeNome : string = null

  tipos = [new Option("bo_ShipTo","ENTREGA"),new Option("bo_BillTo","COBRANCA")]

  ngOnInit(): void {
    this.carregaLocalidade()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes["endereco"])
      this.carregaLocalidade()
    this.ref.detectChanges()
  }

  mostraLocalidade() : boolean{
    return this.localidadeSempreVisivel || this.endereco?.AddressType == 'bo_ShipTo'
  }

  changeEstado($event){
    this.endereco.State = $event
  }

  changeCidade($event){
    this.endereco.County = $event
  }

  changeTipo($event){
    this.endereco.AddressType = $event
  }

  changeLocalidade($event){
    const localidade : Localidade = $event
    if(!localidade)
      return
    this.endereco.U_Localidade = Number(localidade.Code)
    this.localidadeNome = localidade.Name
    this.localidadeSearch?.clear()
  }

  removeLocalidade(){
    this.endereco.U_Localidade = null
    this.localidadeNome = null
  }

  //as linhas do SAP guardam apenas o codigo, buscamos o nome para exibir
  private carregaLocalidade(){
    this.localidadeNome = null
    if(!this.endereco?.U_Localidade)
      return
    this.localidadeService.get(this.endereco.U_Localidade).subscribe({
      next : (it) => {
        this.localidadeNome = it?.Name
        this.ref.detectChanges()
      },
      error : () => this.localidadeNome = null
    })
  }

}
