import { Component, OnInit } from '@angular/core';
import { AutorizadorService } from '../../../modulos/sap-shared/_services/autorizador.service';
import { AlertService } from '../../../shared/service/alert.service';
import { Autorizador } from '../../model/autorizador';
import { Column } from '../../../shared/components/table/column.model';
import { ActionReturn } from '../../../shared/components/action/action.model';

@Component({
  selector: 'app-autorizador',
  templateUrl: './autorizador.component.html',
})
export class AutorizadorComponent implements OnInit {

  loading = false
  lista : Array<Autorizador> = []

  //form de nova linha (motivo -> usuario que autoriza esse motivo)
  novoAutorizador : any = { U_motivo: '', U_usuario: '' }

  definicaoLista : Array<Column> = [
    new Column('Motivo', 'U_motivo'),
    new Column('Usuário', 'U_usuario'),
  ]

  constructor(private service : AutorizadorService, private alert : AlertService){
  }

  ngOnInit(): void {
    this.carregar()
  }

  carregar(){
    this.loading = true
    this.service.getTodos().subscribe({
      next : (it) => { this.lista = it; this.loading = false },
      error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  adicionar(){
    if(!this.novoAutorizador.U_motivo || !this.novoAutorizador.U_usuario){
      this.alert.info('Informe o motivo e o usuário')
      return
    }
    this.loading = true
    this.service.criar(this.novoAutorizador).subscribe({
      next : () => {
        this.novoAutorizador = { U_motivo: '', U_usuario: '' }
        this.carregar()
      },
      error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  onAction(event : ActionReturn){
    if(event.type === 'remover')
      this.remover(event.data)
  }

  private remover(autorizador : Autorizador){
    this.alert.confirm(`Remover a autorização de ${autorizador.U_usuario} pro motivo '${autorizador.U_motivo}'?`).then(res => {
      if(!res.isConfirmed) return
      this.loading = true
      this.service.remover(autorizador.Code).subscribe({
        next : () => this.carregar(),
        error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
      })
    })
  }

  private mensagemErro(e : any) : string {
    return e?.error?.message || e?.error?.error?.message?.value || e?.message || 'Nao foi possivel completar a operacao'
  }
}
