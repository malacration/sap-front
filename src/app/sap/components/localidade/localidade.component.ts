import { Component, OnInit } from '@angular/core';
import { LocalidadeService } from '../../../modulos/sap-shared/_services/localidade.service';
import { AlertService } from '../../../shared/service/alert.service';
import { Localidade } from '../../model/localidade/localidade';
import { Page } from '../../model/page.model';

@Component({
  selector: 'app-localidade',
  templateUrl: './localidade.component.html',
})
export class LocalidadeComponent implements OnInit {

  loading = false
  salvando = false
  filtro = ''
  pageContent : Page<Localidade> = new Page()
  novaLocalidade : Partial<Localidade> = { Code: '', Name: '' }

  constructor(private service : LocalidadeService,
              private alert : AlertService) {
  }

  ngOnInit(): void {
    this.buscar()
  }

  buscar(){
    this.filtro = this.normalizaNomeLocalidade(this.filtro).trim()
    const busca = this.filtro || '*'
    this.loading = true
    this.service.search(busca).subscribe({
      next : (it) => this.pageContent = it,
      complete : () => this.loading = false,
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  limparFiltro(){
    this.filtro = ''
    this.buscar()
  }

  salvar(){
    const localidade = {
      Code: this.normalizaCodigoLocalidade(this.novaLocalidade.Code),
      Name: this.normalizaNomeLocalidade(this.novaLocalidade.Name),
    }

    if(!localidade.Code || !localidade.Name){
      this.alert.info('Informe o código e o nome da localidade.')
      return
    }

    this.salvando = true
    this.service.criar(localidade).subscribe({
      next : () => {
        this.salvando = false
        this.novaLocalidade = { Code: '', Name: '' }
        this.alert.info('Localidade cadastrada com sucesso.')
        this.filtro = localidade.Code
        this.buscar()
      },
      error : (e) => {
        this.salvando = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  atualizaCodigoLocalidade(value : string){
    this.novaLocalidade.Code = this.normalizaCodigoLocalidade(value)
  }

  atualizaNomeLocalidade(value : string){
    this.novaLocalidade.Name = this.normalizaNomeLocalidade(value)
  }

  private normalizaCodigoLocalidade(value : string) : string {
    return this.removeAcentos(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .trim()
  }

  normalizaNomeLocalidade(value : string) : string {
    return this.removeAcentos(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trimStart()
  }

  private removeAcentos(value : string) : string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  private mensagemErro(e : any) : string {
    return e?.error?.message || e?.error?.error?.message?.value || e?.message || 'Não foi possível concluir a operação'
  }
}
