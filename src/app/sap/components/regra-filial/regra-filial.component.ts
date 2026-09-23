import { Component, OnInit } from '@angular/core';
import { RegraFilialService } from '../../../modulos/sap-shared/_services/regra-filial.service';
import { AutorizadorService } from '../../../modulos/sap-shared/_services/autorizador.service';
import { BranchService } from '../../service/branch.service';
import { AlertService } from '../../../shared/service/alert.service';
import { RegraFilial } from '../../model/regra-filial';
import { Branch } from '../../model/branch';
import { Column } from '../../../shared/components/table/column.model';
import { ActionReturn } from '../../../shared/components/action/action.model';

@Component({
  selector: 'app-regra-filial',
  templateUrl: './regra-filial.component.html',
})
export class RegraFilialComponent implements OnInit {

  loading = false
  lista : Array<RegraFilial> = []
  filiais : Array<Branch> = []

  //form de nova linha (motivo -> filial onde essa regra vale)
  novaRegraFilial : any = { U_motivo: '', U_filial: '' }

  //mesma fonte do cadastro de autorizador: os motivos que o motor de regras produz de
  //verdade. Motivo digitado a mao criaria restricao de filial pra regra que nao existe.
  motivos : Array<string> = []

  definicaoLista : Array<Column> = [
    new Column('Motivo', 'U_motivo'),
    new Column('Filial', 'filialNome'),
  ]

  constructor(private service : RegraFilialService,
              private autorizadorService : AutorizadorService,
              private branchService : BranchService,
              private alert : AlertService){
  }

  ngOnInit(): void {
    this.carregarFiliais()
    this.carregarMotivos()
  }

  private carregarMotivos(){
    this.autorizadorService.getMotivos().subscribe({
      next : it => { this.motivos = it ?? [] },
      //falha aqui nao pode travar a tela: a lista continua visivel e so o cadastro fica
      //indisponivel ate os motivos carregarem, em vez de voltar pro campo livre
      error : () => { this.motivos = [] }
    })
  }

  //as filiais vem antes da lista de proposito: e com elas que cada linha ganha o nome da
  //filial (o backend guarda so o BPLId)
  private carregarFiliais(){
    this.branchService.get().subscribe({
      next : it => { this.filiais = it ?? []; this.carregar() },
      error : () => { this.filiais = []; this.carregar() }
    })
  }

  carregar(){
    this.loading = true
    this.service.getTodos().subscribe({
      next : (it) => {
        this.lista = (it ?? []).map(regra => {
          regra.filialNome = this.nomeFilial(regra.U_filial)
          return regra
        })
        this.loading = false
      },
      error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  nomeFilial(bplid : string) : string {
    const filial = this.filiais.find(it => String(it.Bplid ?? it.BPLID) === String(bplid))
    if(!filial)
      return bplid
    return `${bplid} - ${filial.Bplname || filial.BPLName}`
  }

  selecionaFilial($event : Branch){
    this.novaRegraFilial.U_filial = $event ? String($event.Bplid ?? $event.BPLID) : ''
  }

  adicionar(){
    if(!this.novaRegraFilial.U_motivo || !this.novaRegraFilial.U_filial){
      this.alert.info('Informe o motivo e a filial')
      return
    }
    this.loading = true
    this.service.criar(this.novaRegraFilial).subscribe({
      next : () => {
        this.novaRegraFilial = { U_motivo: '', U_filial: '' }
        this.carregar()
      },
      error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  onAction(event : ActionReturn){
    if(event.type === 'remover')
      this.remover(event.data)
  }

  private remover(regra : RegraFilial){
    this.alert.confirm(`Desativar a regra '${regra.U_motivo}' na filial ${this.nomeFilial(regra.U_filial)}?`).then(res => {
      if(!res.isConfirmed) return
      this.loading = true
      this.service.remover(regra.Code).subscribe({
        next : () => this.carregar(),
        error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
      })
    })
  }

  //motivos que ainda nao tem nenhuma filial cadastrada - a tela precisa dizer isso em voz
  //alta, porque nesse estado a regra vale em TODAS as filiais, que e o oposto do que quem
  //olha uma lista vazia costuma concluir
  motivosSemRestricao() : Array<string> {
    return this.motivos.filter(motivo => !this.lista.some(it => it.U_motivo === motivo))
  }

  private mensagemErro(e : any) : string {
    return e?.error?.message || e?.error?.error?.message?.value || e?.message || 'Nao foi possivel completar a operacao'
  }
}
