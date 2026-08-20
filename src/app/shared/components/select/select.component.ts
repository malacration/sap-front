import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { Option, OptionGroup } from '../../../sap/model/form/option';


@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss']
})
export class SelectComponent implements OnInit {

  constructor(private elementRef : ElementRef){
  }

  @Input()
  label = 'Selecione'

  @Input()
  loading : boolean = false

  @Input()
  options : Array<Option> = [

  ]

  selected = 'inicial'

  @Input()
  initialSelect : any

  // Modo multiple: troca o <select> nativo por um dropdown de checkbox. Nativo com
  // multiple exige ctrl+click e ocupa a altura de uma listbox - nao cabe numa linha de filtro.
  @Input()
  multiple : boolean = false

  // Pre-selecao do modo multiple, em Option.value. E setter porque a lista de opcoes
  // costuma chegar depois do ngOnInit (branch-select busca as filiais no backend), entao
  // quem usa so consegue informar a pre-selecao num segundo ciclo.
  @Input()
  set initialSelectMany(valores : Array<any>){
    this.selecionados = valores ? [...valores] : []
  }

  /**
   * Modo multiple AGRUPADO: em vez da lista plana de checkbox, um nó pai por grupo - marcável,
   * com estado intermediário quando parte do grupo está marcada - e as opções recolhíveis
   * embaixo. Quem passa `options` continua no modo plano, sem mudança nenhuma.
   */
  @Input()
  set grupos(grupos : Array<OptionGroup>){
    this.gruposInternos = grupos ?? []
    // Todos recolhidos menos o primeiro: grupo grande (24 meses, no filtro de cobranca) abriria
    // o painel com uma lista que o usuario tem que rolar pra achar o que quer.
    this.recolhidos = new Set(this.gruposInternos.slice(1).map(grupo => grupo.label))
  }

  get grupos() : Array<OptionGroup>{
    return this.gruposInternos
  }

  // Texto do botao quando nada esta marcado. No modo agrupado, selecao vazia costuma significar
  // "sem restricao" (a tela de cobranca passa "Todos"), nao "nada escolhido".
  @Input()
  rotuloSemSelecao = 'Selecione'

  // Substantivo da contagem no botao: "3 selecionadas", "3 meses".
  @Input()
  nomeNoPlural = 'selecionadas'

  selecionados : Array<any> = []
  aberto = false

  private gruposInternos : Array<OptionGroup> = []
  private recolhidos = new Set<string>()

  @Output()
  selectedOut = new EventEmitter<any>();

  onChange($event){
    this.initialSelect = this.selected
    this.selectedOut.emit(this.selected)
  }

  ngOnInit(): void {
    if(this.initialSelect)
      this.selected = this.initialSelect
  }

  unselect(){
    this.selected = 'inicial'
    this.selecionados = []
  }

  toggleAberto(){
    this.aberto = !this.aberto
  }

  // Mesmo padrao do dropdown de acoes da venda futura: fecha no clique fora sem depender
  // do JS do Admin LTE (que e jQuery).
  //
  // Testa o proprio host, nao a classe .app-select-multi: a classe casa com QUALQUER
  // multi-select da pagina, entao dois na mesma tela (o SCSS ja preve filial e cobrador)
  // nunca se fechariam - clicar em um deixaria os dois menus abertos e sobrepostos.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event : MouseEvent){
    if(this.multiple && !this.elementRef.nativeElement.contains(event.target))
      this.aberto = false
  }

  estaSelecionado(it : Option){
    return this.selecionados.includes(it.value)
  }

  // O menu NAO fecha ao marcar: quem abre um filtro multiple normalmente marca mais de um.
  alternar(it : Option){
    this.selecionados = this.estaSelecionado(it)
      ? this.selecionados.filter(valor => valor !== it.value)
      : [...this.selecionados, it.value]
    this.selectedOut.emit([...this.selecionados])
  }

  limparSelecao(){
    this.selecionados = []
    this.selectedOut.emit([])
  }

  get agrupado(){
    return this.gruposInternos.length > 0
  }

  get semSelecao(){
    return this.selecionados.length == 0
  }

  estaRecolhido(label : string){
    return this.recolhidos.has(label)
  }

  alternarRecolhido(label : string){
    if(this.recolhidos.has(label))
      this.recolhidos.delete(label)
    else
      this.recolhidos.add(label)
  }

  // Cobre as opcoes que o grupo OFERECE: grupo da ponta pode ter menos itens que o esperado
  // (com janela de 24 meses, 2024 comeca em setembro) e e isso que o painel mostra.
  grupoMarcado(grupo : OptionGroup){
    return grupo.options.length > 0 && grupo.options.every(it => this.estaSelecionado(it))
  }

  grupoParcial(grupo : OptionGroup){
    const marcados = grupo.options.filter(it => this.estaSelecionado(it)).length
    return marcados > 0 && marcados < grupo.options.length
  }

  // Marcar o grupo marca as opcoes dele, nao o grupo como valor: quem escuta recebe sempre
  // valores de opcao.
  alternarGrupo(grupo : OptionGroup){
    const valoresDoGrupo = grupo.options.map(it => it.value)
    const semOGrupo = this.selecionados.filter(valor => !valoresDoGrupo.includes(valor))
    this.selecionados = this.grupoMarcado(grupo) ? semOGrupo : [...semOGrupo, ...valoresDoGrupo]
    this.selectedOut.emit([...this.selecionados])
  }

  /**
   * "(Todos)" do modo agrupado: selecao vazia, isto e, sem restricao.
   *
   * A caixa precisa ser reposta na mao. No clique o browser desmarca sozinho e, quando ja estava
   * tudo limpo, o [checked] continua valendo true - sem mudanca de binding o Angular nao reescreve
   * a propriedade e a caixa ficava desmarcada pra sempre.
   */
  limparSelecaoDeTodos(evento? : Event){
    const caixa = evento?.target as HTMLInputElement | undefined
    if(caixa)
      caixa.checked = true
    if(this.semSelecao)
      return
    this.limparSelecao()
  }

  get resumoSelecao(){
    if(this.selecionados.length == 0)
      return this.rotuloSemSelecao
    if(this.selecionados.length == 1)
      return this.descricaoDe(this.selecionados[0])
    return `${this.selecionados.length} ${this.nomeNoPlural}`
  }

  // No modo agrupado a descricao sozinha e ambigua ("Julho" de qual ano?), entao o rotulo do
  // grupo entra junto.
  private descricaoDe(valor : any){
    const grupo = this.gruposInternos.find(it => it.options.some(opcao => opcao.value === valor))
    if(grupo){
      const opcao = grupo.options.find(it => it.value === valor)
      return opcao ? `${opcao.description}/${grupo.label}` : ''
    }
    return this.options.find(it => it.value === valor)?.description ?? ''
  }

  // Mantém os <option> estáveis entre ciclos de change detection.
  // Sem isso, getters que retornam um novo array a cada CD fazem o Angular
  // recriar todos os <option>, o que no Firefox fecha o dropdown nativo aberto.
  trackByOption(_: number, it: Option){
    return it?.value;
  }
}
