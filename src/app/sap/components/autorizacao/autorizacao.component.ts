import { Component, OnInit } from '@angular/core';
import { AutorizacaoService } from '../../../modulos/sap-shared/_services/autorizacao.service';
import { AlertService } from '../../../shared/service/alert.service';
import { Autorizacao } from '../../model/autorizacao';
import { Column } from '../../../shared/components/table/column.model';
import { ActionReturn } from '../../../shared/components/action/action.model';

@Component({
  selector: 'app-autorizacao',
  templateUrl: './autorizacao.component.html',
})
export class AutorizacaoComponent implements OnInit {

  loadingPendentes = false
  loadingHistorico = false
  pendentes : Array<Autorizacao> = []
  historico : Array<Autorizacao> = []

  definicaoPendentes : Array<Column> = [
    new Column('Tipo', 'tipoDocumentoLabel'),
    new Column('Cliente', 'U_cardName'),
    new Column('Valor', 'U_valor'),
    new Column('Motivo', 'U_motivo'),
    new Column('Solicitante', 'U_solicitante'),
  ]

  definicaoHistorico : Array<Column> = [
    new Column('Tipo', 'tipoDocumentoLabel'),
    new Column('Cliente', 'U_cardName'),
    new Column('Valor', 'U_valor'),
    new Column('Motivo', 'U_motivo'),
    new Column('Status', 'statusLabel'),
    new Column('Solicitante', 'U_solicitante'),
    new Column('Autorizador', 'U_autorizador'),
    new Column('Observação', 'U_observacao'),
  ]

  constructor(private service : AutorizacaoService, private alert : AlertService){
  }

  ngOnInit(): void {
    this.carregar()
    this.carregarHistorico()
  }

  carregar(){
    this.loadingPendentes = true
    this.service.getPendentes().subscribe({
      next : (it) => { this.pendentes = it; this.loadingPendentes = false },
      error : (e) => { this.loadingPendentes = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  carregarHistorico(){
    this.loadingHistorico = true
    this.service.getTodas().subscribe({
      next : (it) => { this.historico = it; this.loadingHistorico = false },
      error : (e) => { this.loadingHistorico = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  onAction(event : ActionReturn){
    const autorizacao : Autorizacao = event.data
    if(event.type === 'aprovar')
      this.aprovar(autorizacao)
    else if(event.type === 'rejeitar')
      this.rejeitar(autorizacao)
  }

  private aprovar(autorizacao : Autorizacao){
    this.alert.confirm(
      `Aprovar ${autorizacao.tipoDocumentoLabel()} de ${autorizacao.U_cardName} (motivo: ${autorizacao.U_motivo})? ` +
      'O documento será criado no SAP imediatamente.'
    ).then(res => {
      if(!res.isConfirmed) return
      this.loadingPendentes = true
      this.service.aprovar(autorizacao.Code).subscribe({
        next : () => {
          this.alert.info('Documento aprovado e criado com sucesso.')
          this.carregar()
          this.carregarHistorico()
        },
        error : (e) => { this.loadingPendentes = false; this.alert.error(this.mensagemErro(e)) }
      })
    })
  }

  private rejeitar(autorizacao : Autorizacao){
    this.alert.confirmWithInput(
      `Rejeitar ${autorizacao.tipoDocumentoLabel()} de ${autorizacao.U_cardName}? Informe o motivo da rejeição:`,
      'textarea'
    ).then(res => {
      if(!res.isConfirmed) return
      this.loadingPendentes = true
      this.service.rejeitar(autorizacao.Code, res.value).subscribe({
        next : () => {
          this.alert.info('Documento rejeitado.')
          this.carregar()
          this.carregarHistorico()
        },
        error : (e) => { this.loadingPendentes = false; this.alert.error(this.mensagemErro(e)) }
      })
    })
  }

  private mensagemErro(e : any) : string {
    return e?.error?.message || e?.error?.error?.message?.value || e?.error || e?.message || 'Nao foi possivel completar a operacao'
  }
}
