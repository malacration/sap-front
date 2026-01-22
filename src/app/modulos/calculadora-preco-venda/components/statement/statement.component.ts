import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Analise } from '../../models/analise';
import { ActivatedRoute } from '@angular/router';
import { Subscription, map } from 'rxjs';
import { Produto } from '../../models/produto';
import { CalculadoraService } from '../../service/calculadora.service';
import { ParameterService } from '../../../../shared/service/parameter.service';
import { WsService } from '../../../../shared/WsService';
import { SelecaoProdutoComponent } from '../selecao-produto/selecao-produto.component';

@Component({
  selector: 'statement-calc',
  templateUrl: './statement.component.html',
})
export class CalculadoraStatementComponent implements OnInit, OnDestroy {
  

  @ViewChild(SelecaoProdutoComponent) selecaoProdutoComponent?: SelecaoProdutoComponent;

  analiseSelected : Analise = null
  routeSubscriptions : Array<Subscription> = new Array()
  private wsSubscription: Subscription | null = null
  produtoSelecionado : Produto = null
  carregando = false

  percentageValue

  relatoriosSalvos : Array<string> = new Array()

  constructor(
    private service : CalculadoraService,
    private parameterService : ParameterService,
    private cdRef: ChangeDetectorRef,
    private route: ActivatedRoute,
    private wsService: WsService){
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

  solicitarProdutos($event: {codeStart: string; codeEnd: string; warehouse: number}){
    if (!this.analiseSelected) return;
    this.wsSubscription?.unsubscribe();
    const jobId = crypto.randomUUID();
    this.wsSubscription = this.wsService.request<Produto[]>(
      '/calculadora-preco/get-async',
      { jobId, params: {codeStart: $event.codeStart, codeEnd: $event.codeEnd, warehouse: $event.warehouse} }
    ).pipe(
      map((produtos) =>
        produtos.map((produto) => {
          const novoProduto = Object.assign(new Produto(), produto);
          if (Array.isArray(novoProduto.Ingredientes)) {
            novoProduto.Ingredientes = novoProduto.Ingredientes.map(
              (ingrediente) => Object.assign(new Produto(), ingrediente)
            );
          }
          return novoProduto;
        })
      )
    ).subscribe((it) => {
      this.selecaoProdutos(it);
      this.selecaoProdutoComponent?.finalizarSelecao();
    });
  }

  selecaoProdutos($event){
    const novosProdutos = $event ?? [];
    const atuais = this.analiseSelected?.produtos ?? [];
    this.analiseSelected.produtos = atuais.concat(novosProdutos);
  }

  ngOnDestroy(): void {
    this.routeSubscriptions.forEach(it => it.unsubscribe())
    this.wsSubscription?.unsubscribe();
  }

  fecharAnalise() {
    this.analiseSelected = null;
    this.ngOnInit()
  }

}
