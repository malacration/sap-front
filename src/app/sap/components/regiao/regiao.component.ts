import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LocalidadeSearchComponent } from '../../../modulos/sap-shared/componentes/localidade-search/localidade-search.component';
import { RegiaoService } from '../../../modulos/sap-shared/_services/regiao.service';
import { LocalidadeService } from '../../../modulos/sap-shared/_services/localidade.service';
import { AlertService } from '../../../shared/service/alert.service';
import { Regiao, RegiaoFaixa, SimulacaoFrete } from '../../model/regiao/regiao';
import { Localidade } from '../../model/localidade/localidade';
import { Page } from '../../model/page.model';
import { Branch } from '../../model/branch';
import { BranchService } from '../../service/branch.service';
import { Option } from '../../model/form/option';
import { RegiaoDadosImpressao, RegiaoFretePdfComponent } from './regiao-frete-pdf/regiao-frete-pdf.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-regiao',
  templateUrl: './regiao.component.html',
})
export class RegiaoComponent implements OnInit, OnDestroy {

  loading = false
  pageContent : Page<Regiao> = new Page()
  selecionada : Regiao = null
  filtro : string = ''
  filialFiltro : number = null

  //abas da listagem: so uma regiao por filial pode estar ativa ao mesmo tempo,
  //as demais (ex.: uma promocional aguardando a data de troca) ficam em inativas
  aba : 'ativas' | 'inativas' = 'ativas'

  //resolvidas no front, sob demanda, so quando a regiao e aberta - custo nao fica no back
  localidades : Array<Localidade> = new Array()
  loadingLocalidades = false

  //carregado uma unica vez, lista pequena, so pra exibir o nome da filial vinculada
  filiais : Array<Branch> = new Array()

  criandoRegiao = false
  novaRegiao : any = { Code: '', U_NomeRegiao: '', U_CodCordenador: '', U_Filial: null }

  //localidade escolhida no buscador, aguardando a distancia antes de confirmar o vinculo
  localidadePendente : Localidade = null
  distanciaPendente : number = null
  novaLocalidade : Partial<Localidade> = { Code: '', Name: '' }
  salvandoLocalidade = false

  //edicao inline da distancia de um vinculo ja existente
  distanciaEmEdicao : { [codigo : string] : number } = {}

  //form de faixa de preco, reaproveitado tanto pra criar quanto pra editar
  faixaEmEdicaoLineId : number = null
  formFaixa : any = { qtdeAte : null, valorKm : null }

  //simulador de frete: usa os dados ja carregados na regiao selecionada, sem chamada nova
  calcCodLocalidade : string = null
  calcQuantidade : number = null

  //geracao da tabela de frete de todas as regioes, disparada da tela de listagem
  gerandoTabelaTodas = false

  //troca explicita da regiao ativa de uma filial (disparada a partir da regiao
  //ja ativa): substituindo guarda a regiao que sera desativada, candidatasSubstituir
  //sao as inativas elegiveis (mesma filial) pra assumir o lugar dela
  substituindo : Regiao = null
  candidatasSubstituir : Array<Regiao> = []
  loadingCandidatas = false
  filialSelecionadaModal : Branch = null

  @ViewChild('localidadeSearch') localidadeSearch : LocalidadeSearchComponent
  @ViewChild('fretePdf') fretePdf : RegiaoFretePdfComponent
  @ViewChild('modalSubstituir', { static: true }) modalSubstituir : ModalComponent
  @ViewChild('modalNovaLocalidade', { static: true }) modalNovaLocalidade : ModalComponent
  @ViewChild('modalAlterarFilial', { static: true }) modalAlterarFilial : ModalComponent

  //reflete a regiao selecionada na URL (/regioes/:code), pra sobreviver a um F5
  private routeSub : Subscription

  constructor(private service : RegiaoService,
              private localidadeService : LocalidadeService,
              private branchService : BranchService,
              private alert : AlertService,
              private router : Router,
              private route : ActivatedRoute){
  }

  ngOnInit(): void {
    this.branchService.get().subscribe(it => this.filiais = it || [])
    this.routeSub = this.route.paramMap.subscribe(params => {
      const code = params.get('code')
      if(code)
        this.carregarSelecionada(code)
      else {
        this.selecionada = null
        this.pageChange(0)
      }
    })
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe()
  }

  private carregarSelecionada(code : string){
    this.loading = true
    this.service.get(code).subscribe({
      next : (it) => {
        this.loading = false
        this.selecionada = it
        this.carregarLocalidades()
      },
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
        this.router.navigate(['/logistica/frete'])
      }
    })
  }

  pageChange(pagina : number){
    this.loading = true
    this.service.getPage(pagina, this.filtro, this.aba == 'ativas', this.filialFiltro).subscribe({
      next : (it) => this.pageContent = it,
      complete : () => this.loading = false,
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  mudarAba(aba : 'ativas' | 'inativas'){
    if(this.aba == aba)
      return
    this.aba = aba
    this.pageChange(0)
  }

  filtrar(){
    this.pageChange(0)
  }

  limpar(){
    this.filtro = ''
    this.filialFiltro = null
    this.pageChange(0)
  }

  selecionaFilialFiltro($event){
    this.filialFiltro = $event ? this.bplid($event) : null
    this.pageChange(0)
  }

  ativar(regiao : Regiao){
    this.loading = true
    this.service.ativar(regiao.Code).subscribe({
      next : () => this.pageChange(0),
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  desativar(regiao : Regiao){
    this.loading = true
    this.service.desativar(regiao.Code).subscribe({
      next : () => this.pageChange(0),
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  //abre o modal de troca a partir da regiao ATIVA, carregando as inativas da mesma filial
  abrirSubstituir(regiao : Regiao){
    this.substituindo = regiao
    this.candidatasSubstituir = []
    this.loadingCandidatas = true
    this.modalSubstituir.openModal()
    this.service.getTodas().subscribe({
      next : (todas) => {
        this.loadingCandidatas = false
        this.candidatasSubstituir = todas.filter(r => !r.ativa && r.U_Filial == regiao.U_Filial)
      },
      error : (e) => {
        this.loadingCandidatas = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  cancelarSubstituir(){
    this.substituindo = null
    this.modalSubstituir.closeModal()
  }

  //desativa `substituindo` e ativa `nova` atomicamente (batch) no back
  confirmarSubstituir(nova : Regiao){
    if(!this.substituindo)
      return
    const codeAtual = this.substituindo.Code
    this.loading = true
    this.modalSubstituir.closeModal()
    this.service.substituir(codeAtual, nova.Code).subscribe({
      next : () => {
        this.substituindo = null
        if(this.selecionada)
          this.carregarSelecionada(this.selecionada.Code)
        else
          this.pageChange(0)
      },
      error : (e) => {
        this.loading = false
        this.substituindo = null
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  abrirNovaRegiao(){
    this.novaRegiao = { Code: '', U_NomeRegiao: '', U_CodCordenador: '', U_Filial: null }
    this.criandoRegiao = true
  }

  cancelarNovaRegiao(){
    this.criandoRegiao = false
  }

  salvarNovaRegiao(){
    this.loading = true
    this.service.criar(this.novaRegiao).subscribe({
      next : () => {
        this.criandoRegiao = false
        this.pageChange(0)
      },
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  selecionaFilialNova($event){
    this.novaRegiao.U_Filial = this.bplid($event)
  }

  //o Branch vindo do app-select as vezes traz Bplid/BPLID dependendo da origem, cobrimos os dois
  bplid(branch : any) : number {
    const valor = branch?.BPLID ?? branch?.Bplid
    return valor != null ? Number(valor) : null
  }

  nomeFilial(bplid : number) : string {
    if(!bplid)
      return '-'
    const filial : any = this.filiais.find(it => this.bplid(it) == bplid)
    return filial ? (filial.BPLName ?? filial.Bplname) : String(bplid)
  }

  seleciona(regiao : Regiao){
    this.router.navigate(['/configuracoes/frete', regiao.Code])
  }

  gerarTabelaFrete(){
    if(this.localidades.length == 0){
      this.alert.info('Essa região não tem localidades vinculadas para gerar a tabela')
      return
    }
    if(this.faixasOrdenadas.length == 0){
      this.alert.info('Essa região não tem faixas de preço cadastradas para gerar a tabela')
      return
    }
    this.fretePdf?.gerarPdf()
  }

  //gera a tabela de frete de todas as regioes (respeitando o filtro atual), disparado da listagem
  gerarTabelaFreteTodas(){
    this.gerandoTabelaTodas = true
    this.service.getTodas(this.filtro).subscribe({
      next : (regioes) => this.prepararImpressaoTodas(regioes),
      error : (e) => {
        this.gerandoTabelaTodas = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  //resolve o nome das localidades de cada regiao (em paralelo) e so entao gera o pdf de todas
  private prepararImpressaoTodas(regioes : Array<Regiao>){
    //so imprime regioes ativas - uma inativa (ex.: aguardando a data de troca)
    //nao deve aparecer na tabela de frete vigente
    const comDados = regioes.filter(r => r.ativa && r.getLocalidades().length > 0 && r.getFaixasOrdenadas().length > 0)
    if(comDados.length == 0){
      this.gerandoTabelaTodas = false
      this.alert.info('Nenhuma região com localidades e faixas de preço cadastradas para gerar a tabela')
      return
    }
    forkJoin(
      comDados.map(regiao =>
        forkJoin(
          regiao.getLocalidades().map(codigo => this.localidadeService.get(codigo).pipe(catchError(() => of(null))))
        ).pipe(map(localidades => ({ regiao, localidades : localidades.filter(it => !!it) } as RegiaoDadosImpressao)))
      )
    ).subscribe(dados => {
      this.gerandoTabelaTodas = false
      this.fretePdf?.gerarPdfTodasRegioes(dados)
    })
  }

  fechar(){
    this.localidades = []
    this.localidadePendente = null
    this.calcCodLocalidade = null
    this.calcQuantidade = null
    this.cancelarEdicaoFaixa()
    this.router.navigate(['/logistica/frete'])
  }

  ativarSelecionada(){
    if(!this.selecionada)
      return
    this.loading = true
    this.service.ativar(this.selecionada.Code).subscribe({
      next : (it) => this.atualizaSelecionada(it, false),
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  desativarSelecionada(){
    if(!this.selecionada)
      return
    this.loading = true
    this.service.desativar(this.selecionada.Code).subscribe({
      next : (it) => this.atualizaSelecionada(it, false),
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  abreModalAlterarFilial(){
    this.filialSelecionadaModal = null
    this.modalAlterarFilial.openModal()
  }

  selecionaFilialModal($event){
    this.filialSelecionadaModal = $event
  }

  confirmaAlterarFilial(){
    if(!this.selecionada)
      return
    const bplid = this.bplid(this.filialSelecionadaModal)
    if(!bplid)
      return

    this.alert.confirm(
      `Alterar a filial da região ${this.selecionada.U_NomeRegiao || this.selecionada.Name} de ` +
      `${this.nomeFilial(this.selecionada.U_Filial)} para ${this.nomeFilial(bplid)}?`
    ).then(result => {
      if(!result.isConfirmed)
        return
      this.loading = true
      this.modalAlterarFilial.closeModal()
      this.service.atualizaFilial(this.selecionada.Code, bplid).subscribe({
        next : (it) => this.atualizaSelecionada(it, false),
        error : (e) => {
          this.loading = false
          this.alert.error(this.mensagemErro(e))
        }
      })
    })
  }

  //busca o nome de cada localidade vinculada; um codigo invalido/orfao nao derruba os demais
  private carregarLocalidades(){
    const codigos = this.selecionada.getLocalidades()
    if(codigos.length == 0){
      this.localidades = []
      return
    }
    this.loadingLocalidades = true
    forkJoin(
      codigos.map(codigo => this.localidadeService.get(codigo).pipe(catchError(() => of(null))))
    ).subscribe(resultado => {
      this.localidades = resultado.filter(it => !!it)
      this.loadingLocalidades = false
    })
  }

  escolheLocalidadePendente($event){
    const localidade : Localidade = $event
    if(!localidade || !this.selecionada)
      return
    if(this.selecionada.getLocalidades().includes(localidade.Code)){
      this.localidadeSearch?.clear()
      this.alert.info('Essa localidade ja esta vinculada a regiao')
      return
    }
    this.localidadePendente = localidade
    this.distanciaPendente = null
  }

  cancelaLocalidadePendente(){
    this.localidadePendente = null
    this.distanciaPendente = null
    this.localidadeSearch?.clear()
  }

  abreModalNovaLocalidade(){
    this.novaLocalidade = { Code: '', Name: '' }
    this.modalNovaLocalidade.openModal()
  }

  salvaNovaLocalidade(){
    const localidade = Object.assign(new Localidade(), {
      Code: this.normalizaCodigoLocalidade(this.novaLocalidade.Code),
      Name: this.normalizaNomeLocalidade(this.novaLocalidade.Name),
    })

    if(!localidade.Code || !localidade.Name){
      this.alert.info('Informe o código e o nome da localidade.')
      return
    }

    this.salvandoLocalidade = true
    this.localidadeService.criar(localidade).subscribe({
      next : (it) => {
        this.salvandoLocalidade = false
        this.modalNovaLocalidade.closeModal()
        this.alert.info('Localidade cadastrada com sucesso.')
        this.escolheLocalidadePendente(it)
      },
      error : (e) => {
        this.salvandoLocalidade = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  atualizaCodigoNovaLocalidade(value : string){
    this.novaLocalidade.Code = this.normalizaCodigoLocalidade(value)
  }

  atualizaNomeNovaLocalidade(value : string){
    this.novaLocalidade.Name = this.normalizaNomeLocalidade(value)
  }

  private normalizaCodigoLocalidade(value : string) : string {
    return this.removeAcentos(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .trim()
  }

  private normalizaNomeLocalidade(value : string) : string {
    return this.removeAcentos(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trimStart()
  }

  private removeAcentos(value : string) : string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  confirmaLocalidadePendente(){
    if(!this.localidadePendente)
      return
    if(this.distanciaPendente == null || isNaN(this.distanciaPendente) || this.distanciaPendente < 0){
      this.alert.info('Informe a distancia ate a localidade para vincular')
      return
    }
    this.loading = true
    this.service.addLocalidade(this.selecionada.Code, this.localidadePendente.Code, this.distanciaPendente).subscribe({
      next : (it) => {
        this.localidadePendente = null
        this.distanciaPendente = null
        this.atualizaSelecionada(it)
      },
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  removeLocalidade(localidade : Localidade){
    this.alert.confirm(`Remover a localidade ${localidade.Name} da regiao ${this.selecionada.U_NomeRegiao}?`)
      .then(result => {
        if(!result.isConfirmed)
          return
        this.loading = true
        this.service.removeLocalidade(this.selecionada.Code, localidade.Code).subscribe({
          next : (it) => {
            if(this.calcCodLocalidade == localidade.Code)
              this.calcCodLocalidade = null
            this.atualizaSelecionada(it)
          },
          error : (e) => {
            this.loading = false
            this.alert.error(this.mensagemErro(e))
          }
        })
      })
  }

  get opcoesLocalidadesCalculo() : Array<Option> {
    return this.localidades.map(it => new Option(it.Code, it.Name))
  }

  selecionaLocalidadeCalculo($event){
    this.calcCodLocalidade = $event
  }

  get resultadoCalculo() : SimulacaoFrete {
    if(!this.selecionada || !this.calcCodLocalidade || !this.calcQuantidade || this.calcQuantidade <= 0)
      return null
    return this.selecionada.calcularFrete(this.calcCodLocalidade, this.calcQuantidade)
  }

  iniciaEdicaoDistancia(localidade : Localidade){
    this.distanciaEmEdicao[localidade.Code] = this.selecionada.getDistancia(localidade.Code) ?? null
  }

  cancelaEdicaoDistancia(localidade : Localidade){
    delete this.distanciaEmEdicao[localidade.Code]
  }

  emEdicaoDistancia(localidade : Localidade) : boolean {
    return this.distanciaEmEdicao[localidade.Code] !== undefined
  }

  salvaDistancia(localidade : Localidade){
    const valor = this.distanciaEmEdicao[localidade.Code]
    if(valor == null || isNaN(valor)){
      this.alert.info('Informe uma distancia valida')
      return
    }
    this.loading = true
    this.service.atualizaDistancia(this.selecionada.Code, localidade.Code, valor).subscribe({
      next : (it) => {
        delete this.distanciaEmEdicao[localidade.Code]
        this.atualizaSelecionada(it)
      },
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  get faixasOrdenadas() : Array<RegiaoFaixa> {
    return this.selecionada?.getFaixasOrdenadas() ?? []
  }

  editaFaixa(faixa : RegiaoFaixa){
    this.faixaEmEdicaoLineId = faixa.LineId
    this.formFaixa = { qtdeAte : faixa.U_QtdeAte, valorKm : faixa.U_ValorKm }
  }

  cancelarEdicaoFaixa(){
    this.faixaEmEdicaoLineId = null
    this.formFaixa = { qtdeAte : null, valorKm : null }
  }

  salvarFaixa(){
    if(this.formFaixa.qtdeAte == null || this.formFaixa.qtdeAte === ''){
      this.alert.info('Informe a quantidade mínima dessa faixa (use 1 para a faixa base)')
      return
    }
    if(!this.formFaixa.valorKm){
      this.alert.info('Informe o valor a cada 100km dessa faixa')
      return
    }
    this.loading = true
    const qtdeMinima = Number(this.formFaixa.qtdeAte)
    const operacao = this.faixaEmEdicaoLineId
      ? this.service.atualizaFaixa(this.selecionada.Code, this.faixaEmEdicaoLineId, qtdeMinima, Number(this.formFaixa.valorKm))
      : this.service.addFaixa(this.selecionada.Code, qtdeMinima, Number(this.formFaixa.valorKm))
    operacao.subscribe({
      next : (it) => {
        this.cancelarEdicaoFaixa()
        this.atualizaSelecionada(it, false)
      },
      error : (e) => {
        this.loading = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  removeFaixa(faixa : RegiaoFaixa){
    this.alert.confirm('Remover essa faixa de preço?')
      .then(result => {
        if(!result.isConfirmed)
          return
        this.loading = true
        this.service.removeFaixa(this.selecionada.Code, faixa.LineId).subscribe({
          next : (it) => this.atualizaSelecionada(it, false),
          error : (e) => {
            this.loading = false
            this.alert.error(this.mensagemErro(e))
          }
        })
      })
  }

  private atualizaSelecionada(regiao : Regiao, recarregarLocalidades : boolean = true){
    this.localidadeSearch?.clear()
    this.selecionada = regiao
    this.pageContent.content = this.pageContent.content.map(it => it.Code == regiao.Code ? regiao : it)
    this.loading = false
    if(recarregarLocalidades)
      this.carregarLocalidades()
  }

  private mensagemErro(e : any) : string {
    return e?.error?.message || e?.error?.error?.message?.value || e?.message || 'Nao foi possivel completar a operacao'
  }
}
