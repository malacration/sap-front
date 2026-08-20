import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BranchService } from '../../../../sap/service/branch.service';
import { Branch } from '../../../../sap/model/branch';
import { Option } from '../../../../sap/model/form/option';
import { ReplaceFilial } from '../../../../utils/replaceFilial';


@Component({
  selector: 'app-branch-select',
  templateUrl: './branch-select.component.html'
})
export class BranchSelectComponent implements OnInit {

  constructor(private service : BranchService){

  }

  @Input()
  selected : string | number = null

  @Input()
  multiple : boolean = false

  // Bplids pre-selecionados no modo multiple (ex.: drill-down do dashboard chega por
  // query param). Casar id -> Branch acontece aqui porque a lista de filiais e daqui.
  //
  // Setter, nao campo: os ids e a lista de filiais chegam em momentos diferentes (a lista vem
  // do backend) e o valor muda depois do ngOnInit - "Limpar" na tela de cobranca manda [] aqui.
  // Calcular so uma vez no ngOnInit deixava o dropdown marcado enquanto a consulta ja tinha
  // saido sem filial nenhuma.
  @Input()
  set selectedMany(ids : Array<string | number>){
    this.idsPreSelecionados = ids ?? []
    this.recalculaPreSelecao()
  }

  get selectedMany() : Array<string | number>{
    return this.idsPreSelecionados
  }

  private idsPreSelecionados : Array<string | number> = []

  branches: Array<Branch> = [];
  opcoes: Array<Option> = [];
  filiaisIniciais: Array<Branch> = [];

  loading = false

  @Output()
  selectedOut = new EventEmitter<Branch>();

  @Output()
  selectedManyOut = new EventEmitter<Array<Branch>>();

  onChange($event){
    if(this.multiple)
      this.selectedManyOut.emit($event ?? [])
    else
      this.selectedOut.emit($event)
  }

  ngOnInit(): void {
    this.loading = true;
    this.service.get().subscribe(data => {
      this.branches = data;
      this.opcoes = data.map(it => new Option(it, this.descricaoDe(it)));
      this.recalculaPreSelecao();
      this.loading = false;
    })
  }

  // Referencia nova so aqui: e ela que o app-select observa pra reaplicar a selecao, entao
  // trocar a cada change detection zeraria o que o usuario acabou de marcar.
  private recalculaPreSelecao(){
    this.filiaisIniciais = this.branches.filter(it => this.estaPreSelecionada(it))
  }

  private estaPreSelecionada(branch : Branch){
    return this.idsPreSelecionados.some(id => String(id) === String(branch.Bplid ?? branch.BPLID))
  }

  // Toda filial vem do SAP prefixada pela mesma razao social, e o prefixo e maior que a
  // largura do controle - sem limpar, as opcoes ficam visualmente identicas e o que as
  // diferencia e justamente a parte cortada. Mesma limpeza que a coluna Filial da tabela usa.
  private descricaoDe(branch : Branch){
    const nome = branch.Bplname || branch.BPLName || ''
    return ReplaceFilial.limparFilial(nome) || nome || String(branch.Bplid ?? branch.BPLID)
  }
}
