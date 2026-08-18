import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { Option } from '../../../sap/model/form/option';


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

  selecionados : Array<any> = []
  aberto = false

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

  get resumoSelecao(){
    if(this.selecionados.length == 0)
      return 'Selecione'
    if(this.selecionados.length == 1)
      return this.descricaoDe(this.selecionados[0])
    return `${this.selecionados.length} selecionadas`
  }

  private descricaoDe(valor : any){
    return this.options.find(it => it.value === valor)?.description ?? ''
  }

  // Mantém os <option> estáveis entre ciclos de change detection.
  // Sem isso, getters que retornam um novo array a cada CD fazem o Angular
  // recriar todos os <option>, o que no Firefox fecha o dropdown nativo aberto.
  trackByOption(_: number, it: Option){
    return it?.value;
  }
}
