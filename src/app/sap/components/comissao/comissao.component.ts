import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComissaoService } from '../../../modulos/sap-shared/_services/comissao.service';
import { AlertService } from '../../../shared/service/alert.service';
import { Comissao, CondicaoComissao, LiberadoPara } from '../../model/comissao';
import { Branch } from '../../model/branch';
import { BranchService } from '../../service/branch.service';
import { SalesPerson } from '../../model/sales-person/sales-person';
import { SalesPersonService } from '../../service/sales-person.service';
import { Column } from '../../../shared/components/table/column.model';
import { ActionReturn } from '../../../shared/components/action/action.model';

@Component({
  selector: 'app-comissao',
  templateUrl: './comissao.component.html',
})
export class ComissaoComponent implements OnInit {

  loading = false
  lista : Array<Comissao> = []
  selecionada : Comissao = null

  criandoNova = false
  novaComissao : any = { Code: null, Name: '', U_porcentagem: 0, U_desconto: 0, U_regressiva: '0' }

  //carregado uma unica vez, so pra exibir o nome da filial vinculada na liberacao
  filiais : Array<Branch> = []

  //cache de vendedores por codigo (SalesEmployeeCode), preenchido sob demanda -
  //nao ha endpoint de listagem completa de vendedores (so get por codigo/busca paginada)
  private vendedoresCache : { [code : string] : SalesPerson } = {}

  //form de nova linha de condicao de pagamento (aba Condicoes de Pagamento)
  formCondicao : any = { U_prazo: null, U_desconto: 0, U_juros: 0 }

  //form de nova linha de liberacao (aba Liberacao)
  formLiberacao : any = { U_Filial: '', U_vendedor: '', vendedorNome: '' }

  definicaoLista : Array<Column> = [
    new Column('Código', 'Code'),
    new Column('Nome', 'Name'),
    new Column('Comissão (%)', 'U_porcentagem'),
    new Column('Desconto Máximo (%)', 'U_desconto'),
    new Column('Regressiva', 'regressivaLabel'),
    new Column('Filiais Liberadas', 'qtdFiliaisLiberadas'),
    new Column('Vendedores Liberados', 'qtdVendedoresLiberados'),
  ]

  constructor(private service : ComissaoService,
              private branchService : BranchService,
              private salesPersonService : SalesPersonService,
              private alert : AlertService,
              private router : Router,
              private route : ActivatedRoute){
  }

  ngOnInit(): void {
    this.branchService.get().subscribe(it => this.filiais = it || [])
    this.route.paramMap.subscribe(params => {
      const code = params.get('code')
      if(code)
        this.carregarSelecionada(Number(code))
      else {
        this.selecionada = null
        this.carregarLista()
      }
    })
  }

  carregarLista(){
    this.loading = true
    this.service.getTodas().subscribe({
      next : (it) => { this.lista = it; this.loading = false },
      error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  private carregarSelecionada(code : number){
    this.loading = true
    this.service.get(code).subscribe({
      next : (it) => { this.selecionada = it; this.loading = false; this.resolverVendedores() },
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
        this.router.navigate(['/configuracoes/comissao'])
      }
    })
  }

  seleciona(comissao : Comissao){
    this.router.navigate(['/configuracoes/comissao', comissao.Code])
  }

  onAction(event : ActionReturn){
    if(event.type === 'selecionar')
      this.seleciona(event.data)
  }

  fechar(){
    this.router.navigate(['/configuracoes/comissao'])
  }

  abrirNova(){
    this.novaComissao = { Code: null, Name: '', U_porcentagem: 0, U_desconto: 0, U_regressiva: '0' }
    this.criandoNova = true
  }

  cancelarNova(){
    this.criandoNova = false
  }

  salvarNova(){
    if(!this.novaComissao.Code){
      this.alert.info('Informe o código da comissão')
      return
    }
    if(!this.novaComissao.Name){
      this.alert.info('Informe o nome/descrição da comissão')
      return
    }
    this.loading = true
    this.service.criar(this.novaComissao).subscribe({
      next : () => { this.criandoNova = false; this.carregarLista() },
      error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  salvarDadosGerais(){
    this.persistirSelecionada('Dados salvos com sucesso')
  }

  adicionarCondicao(){
    if(this.formCondicao.U_prazo == null){
      this.alert.info('Informe o código da condição de pagamento (GroupNum)')
      return
    }
    this.selecionada.CONDICOESFVCollection = [...this.selecionada.CONDICOESFVCollection, { ...this.formCondicao }]
    this.formCondicao = { U_prazo: null, U_desconto: 0, U_juros: 0 }
    this.persistirSelecionada()
  }

  removeCondicao(condicao : CondicaoComissao){
    this.selecionada.CONDICOESFVCollection = this.selecionada.CONDICOESFVCollection.filter(c => c !== condicao)
    this.persistirSelecionada()
  }

  adicionarLiberacao(){
    if(!this.formLiberacao.U_Filial && !this.formLiberacao.U_vendedor){
      this.alert.info('Informe a filial ou o vendedor a liberar')
      return
    }
    this.selecionada.LIBERAPARACollection = [...this.selecionada.LIBERAPARACollection, Object.assign(new LiberadoPara(), {
      U_Filial: this.formLiberacao.U_Filial,
      U_vendedor: this.formLiberacao.U_vendedor,
    })]
    this.formLiberacao = { U_Filial: '', U_vendedor: '', vendedorNome: '' }
    this.persistirSelecionada()
  }

  removeLiberacao(liberacao : LiberadoPara){
    this.selecionada.LIBERAPARACollection = this.selecionada.LIBERAPARACollection.filter(l => l !== liberacao)
    this.persistirSelecionada()
  }

  private persistirSelecionada(mensagemSucesso : string = null){
    this.loading = true
    this.service.atualizar(this.selecionada.Code, this.selecionada).subscribe({
      next : (it) => {
        this.selecionada = it
        this.loading = false
        this.resolverVendedores()
        if(mensagemSucesso)
          this.alert.info(mensagemSucesso)
      },
      error : (e) => { this.loading = false; this.alert.error(this.mensagemErro(e)) }
    })
  }

  selecionaFilialLiberacao($event){
    this.formLiberacao.U_Filial = $event ? String(this.bplid($event)) : ''
  }

  escolheVendedorLiberacao($event){
    if(!$event) return
    this.formLiberacao.U_vendedor = String($event.SalesEmployeeCode)
    this.formLiberacao.vendedorNome = $event.SalesEmployeeName
    this.vendedoresCache[this.formLiberacao.U_vendedor] = Object.assign(new SalesPerson(), $event)
  }

  //busca (uma vez por codigo) e cacheia os vendedores referenciados na liberacao,
  //pra exibir o nome em vez do codigo cru
  private resolverVendedores(){
    const codigos = (this.selecionada?.LIBERAPARACollection || [])
      .map(l => l.U_vendedor)
      .filter(codigo => codigo && this.vendedoresCache[codigo] === undefined)
    codigos.forEach(codigo => {
      this.vendedoresCache[codigo] = null
      this.salesPersonService.get(codigo).subscribe({
        next : (it) => this.vendedoresCache[codigo] = it,
        error : () => this.vendedoresCache[codigo] = null
      })
    })
  }

  nomeVendedor(codigo : string) : string {
    if(!codigo)
      return '-'
    const vendedor = this.vendedoresCache[codigo]
    return vendedor ? String(vendedor.SalesEmployeeName) : codigo
  }

  //o Branch vindo do app-select as vezes traz Bplid/BPLID dependendo da origem, cobrimos os dois
  private bplid(branch : any) : number {
    const valor = branch?.BPLID ?? branch?.Bplid
    return valor != null ? Number(valor) : null
  }

  nomeFilial(bplid : string) : string {
    if(!bplid)
      return '-'
    const filial : any = this.filiais.find(it => String(this.bplid(it)) == bplid)
    return filial ? (filial.BPLName ?? filial.Bplname) : bplid
  }

  private mensagemErro(e : any) : string {
    return e?.error?.message || e?.error?.error?.message?.value || e?.message || 'Nao foi possivel completar a operacao'
  }
}
