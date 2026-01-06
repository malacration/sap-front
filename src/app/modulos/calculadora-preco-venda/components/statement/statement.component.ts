import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Analise } from '../../models/analise';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Produto } from '../../models/produto';
import { CalculadoraService } from '../../service/calculadora.service';
import { ParameterService } from '../../../../shared/service/parameter.service';

@Component({
  selector: 'statement-calc',
  templateUrl: './statement.component.html',
})
export class CalculadoraStatementComponent implements OnInit, OnDestroy {
  

  analiseSelected : Analise = null
  routeSubscriptions : Array<Subscription> = new Array()
  produtoSelecionado : Produto = null
  carregando = false

  percentageValue

  relatoriosSalvos : Array<string> = new Array()

  constructor(
    private service : CalculadoraService,
    private parameterService : ParameterService,
    private cdRef: ChangeDetectorRef,
    private route: ActivatedRoute){
  }

  ngOnInit(): void {
    this.relatoriosSalvos = this.getList()
    this.routeSubscriptions = this.parameterService.subscribeToParam(this.route, "id", id => {
      this.produtoSelecionado = this.analiseSelected?.produtos.find(it => it.ItemCode == id)
      if(!this.produtoSelecionado){
        this.parameterService.removeParam(this.route, "id")
        this.produtoSelecionado = null
      }
    })
  }

  getList() : Array<string>{
    const keys: Array<string> = new Array();
  
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("calculadora-")) {
        let size = this.getSize(localStorage.getItem(key).length)
        keys.push(key.replace("calculadora-","")+" - "+size.toString());
      }
    }
    return keys;
  }

  getSize(totalSize) {
    return totalSize < 1024
        ? `${totalSize} bytes`
        : totalSize < 1024 * 1024
        ? `${(totalSize / 1024).toFixed(2)} KB`
        : `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
  }

  criarAnalise(){
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    this.analiseSelected = new Analise(`Análise gerada em ${timestamp}`)
  }


  carregaAnalise(key : string){
    let nome = key.split(" -")[0]
    this.service.getProdutosFromLocalStorage("calculadora-"+nome).subscribe(it => {
      let analise = new Analise(nome)
      analise.produtos = it
      this.analiseSelected = analise
    })
  }

  excluirAnalise(key : string){
    localStorage.removeItem("calculadora-"+key.split(" -")[0])
    this.relatoriosSalvos = this.getList()
  }

  isSelectProduto(){
    return this.analiseSelected?.produtos.length == 0
  }

  isCustoMercadoria() : boolean{
    return this.produtoSelecionado != null && this.produtoSelecionado != undefined
  }

  isFormacaoPreco() {
    return !this.isSelectProduto() && this.analiseSelected && !this.isCustoMercadoria()
  }

  custoMercadoriaVoltar(){
    this.parameterService.removeParam(this.route, "id")
    this.cdRef.detectChanges()
  }

  selecaoProdutos($event){
    this.analiseSelected.produtos = $event
  }

  ngOnDestroy(): void {
    this.routeSubscriptions.forEach(it => it.unsubscribe())
  }

  fecharAnalise() {
    this.analiseSelected = null;
  }

}


