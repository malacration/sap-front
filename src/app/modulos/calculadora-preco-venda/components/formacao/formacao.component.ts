import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Produto } from '../../models/produto';
import { Analise } from '../../models/analise';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { ItemService } from '../../../../sap/service/item.service';
import { LastPrice } from '../../models/last-price';
import { Observable, Subscription, concat, finalize, map, tap } from 'rxjs';
import { CalculadoraService } from '../../service/calculadora.service';
import { AlertService } from '../../../../shared/service/alert.service';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { CalculadoraPdfComponent } from '../calculadora-pdf/calculadora-pdf.component';
import { CalculadoraPreco } from '../../models/CalculadoraPreco';
import { WsService } from '../../../../shared/WsService';
import { SelecaoProdutoComponent } from '../selecao-produto/selecao-produto.component';

@Component({
  selector: 'formacao-preco',
  templateUrl: './formacao.component.html',
  styleUrls: ['./formacao.component.scss']
})
export class FormacaoPrecoStatementComponent implements OnInit, OnChanges, OnDestroy {
  
  constructor(
    private cdRef: ChangeDetectorRef,
    private service : CalculadoraService,
    private alertService : AlertService,
    private wsService: WsService
  ){

  }

  @ViewChild('custoMercadoria', {static: true}) custoModal: ModalComponent;
  @ViewChild('modalAdicionarItem', {static: true}) adicionarItemModal: ModalComponent;
  @ViewChild('modalAtualizaCustos', {static: true}) modalAtualizaCustos: ModalComponent;
  @ViewChild('calculadoraPdf') calculadoraPdf: CalculadoraPdfComponent;

  @ViewChild('table', {static: true}) table: TableComponent;

  @ViewChild('modalPrazosPagamento', {static: true}) modalPrazos: ModalComponent;
  @ViewChild(SelecaoProdutoComponent) selecaoProdutoComponent?: SelecaoProdutoComponent;

  @Input()
  analise : Analise
  @Output() close = new EventEmitter<void>();

  page = 0
  pageSize = 10
  
  qtdPlanejada = 1
  
  uniqueIngredients : Map<string, Produto> = new Map<string, Produto>()
  showModalAtualizaCustos = false
  private wsSubscription: Subscription | null = null

  ngOnInit(): void {
    let fatorSubProduto = 40
  }

  imprimirPdf() {
    if (this.calculadoraPdf) {
      this.calculadoraPdf.gerarPdf();
    } else {
      console.error('Componente de PDF não foi carregado na tela.');
      this.alertService.error("Erro ao gerar PDF: Componente não inicializado.");
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.analise)
      this.groupUniqueIngredients()
  }

  onToggleCustoSap(){
    this.analise.produtos.forEach(it => it.useCustoSap = !it.useCustoSap)
  }

  isCustoSap() : boolean{
    return this.analise.produtos[0].useCustoSap
  }

  modalChangeCustos($event){
    this.custoModal.openModal()
  }

  modalAdicioanrItem($event){
    this.adicionarItemModal.openModal()
  }

  modalAtualizarCustos($event){
    this.totalProgressBar = this.analise.produtos.length
    this.showModalAtualizaCustos = true
  }

  tipoCustosAcabado = "-1"
  loadingCustos = false
  totalProgressBar = 0
  currentProgressBar = 0
  
  atualizaCustosAcabado(){
    this.loadingCustos = true
    this.totalProgressBar = this.analise.produtos.length
    this.cdRef.detectChanges()
    

    if(this.tipoCustosAcabado == "-1"){
      this.loadingCustos = false
      return this.alertService.error("Informe um tipo de custo")
    }

    const requests: Observable<LastPrice[]>[] = this.analise.produtos.map(produto =>
      this.service.getLastPrice(produto.ItemCode,produto.DefaultWareHouse).pipe(
        tap((result: LastPrice[]) => {
          produto.CustoMateriaPrimaCurrency = this.getByTipoCustosAcabado(result[0])
          this.currentProgressBar++;
        })
      )
    );

    concat(...requests)
      .pipe(
        finalize(() => {
          this.loadingCustos = false;
          this.showModalAtualizaCustos = false
          this.currentProgressBar = 0
        })
      )
      .subscribe();
  }

  atualizaCustosMateriaPrima(){
    this.loadingCustos = true
    const ingredientes = this.getArrayUniqueIngredients();
    this.totalProgressBar = ingredientes.length
    this.cdRef.detectChanges()
    

    if(this.tipoCustosAcabado == "-1"){
      this.loadingCustos = false
      return this.alertService.error("Informe um tipo de custo")
    }

    const requests: Observable<LastPrice[]>[] = ingredientes.map(produto =>
      this.service.getLastPrice(produto.ItemCode, produto.DefaultWareHouse).pipe(
        tap((result: LastPrice[]) => {
          this.analise.produtos.forEach(acabado => {
            acabado.Ingredientes
              .filter(ingrediente => ingrediente.ItemCode == produto.ItemCode).forEach(ingrediente =>{
                ingrediente.custoMateriaPrimaCurrencyEditable = this.getByTipoCustosAcabado(result[0])
            })
          })
            this.currentProgressBar++;
        })
      )
    );

    concat(...requests)
      .pipe(
        finalize(() => {
          this.loadingCustos = false;
          this.showModalAtualizaCustos = false
          this.currentProgressBar = 0
          this.groupUniqueIngredients()
          this.cdRef.detectChanges()
          this.custoModal.forceDetectChanges()
          this.table.forceDetectChanges()
        })
      ).subscribe();
  }


  getByTipoCustosAcabado(lastPrice : LastPrice | undefined) : number{
    if(this.tipoCustosAcabado == 'precoAnalisado'){
      return lastPrice?.LstEvlPric ?? 0; 
    }
    else if(this.tipoCustosAcabado == 'precoCompra'){
      return lastPrice?.LastPurPrc ?? 0;
    }
    else if(this.tipoCustosAcabado == 'precoCustoProducao'){
      return lastPrice?.U_productionCost ?? 0;
    }
    return lastPrice?.AvgPrice ?? 0;
  }

  
  changePage($event){
    this.page = $event
  }
  

  getProdutosPaginado(): Array<Produto> {
    const startIndex = this.page * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.analise.produtos.slice(startIndex, endIndex);
  }

  groupUniqueIngredients(){
    this.analise.produtos.forEach(produto => {
      produto.Ingredientes.forEach(ingrediente => {
          let produto = new Produto()
          produto.ItemCode = ingrediente.ItemCode
          produto.Descricao = ingrediente.Descricao
          produto.custoMateriaPrimaCurrencyEditable = ingrediente.custoMateriaPrimaCurrencyEditable
          produto.DefaultWareHouse = ingrediente.DefaultWareHouse
          this.uniqueIngredients.set(ingrediente.ItemCode, produto);
      });
    });
  }

  getArrayUniqueIngredients() : Array<Produto>{
    return [...Array.from(this.uniqueIngredients.values())];
  }

  changeCustoAllProdutos(){
    this.analise.produtos.forEach(produto => {
      produto.Ingredientes.forEach(it => {
        it.custoMateriaPrimaCurrencyEditable = this.uniqueIngredients.get(it.ItemCode).custoMateriaPrimaCurrencyEditable
      })
    });
    this.cdRef.detectChanges();
  }

  solicitarProdutos($event: {codeStart: string; codeEnd: string; warehouse: number}){
    if (!this.analise) return;
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
      this.adicionarItem(it);
      this.selecaoProdutoComponent?.finalizarSelecao();
    });
  }

  adicionarItem(itens : Array<Produto>){
    this.analise.produtos.push(...itens)
    this.groupUniqueIngredients()
    this.adicionarItemModal.closeModal()
  }

  salvar($event){
    this.analise.produtos.forEach(it => {
        this.removeKeys(it)
        it.Ingredientes.forEach(it => this.removeKeys(it))
    })
    localStorage.setItem("calculadora-"+this.analise.descricao,JSON.stringify(this.analise.produtos))
    this.alertService.info("Salvo com sucesso")
    // this.service.save(new CalculadoraPreco(
    //     this.analise.descricao,
    //     JSON.stringify(this.analise.produtos
    //     )
    // )).subscribe(it => 
    //     console.log(it)
    // )
  }

  solicitarProdutos($event){

  }

  //TODO isso seria de um tableservice talvez
  removeKeys(obj){
    for (const key in obj) {
      if (key.startsWith("formControlFactory")) {
          delete obj[key];
      }
    }
  }

  removeCircularReferences(obj: any, seen = new WeakSet()) {
    if (typeof obj !== "object" || obj === null) {
        return obj; // Se não for objeto, retorna normalmente
    }

    if (seen.has(obj)) {
        return "[Circular]"; // Marca referência circular
    }

    seen.add(obj); // Adiciona ao Set de objetos já vistos

    if (Array.isArray(obj)) {
        return obj.map(item => this.removeCircularReferences(item, seen));
    }

    const cleanedObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cleanedObj[key] = this.removeCircularReferences(obj[key], seen);
        }
    }

    return cleanedObj;
}


  materiaCustoDefinition = [
    new Column('Id', 'ItemCode',null,true),
    new Column('Produtos', 'Descricao',null,true),
    new Column('Custo', 'custoMateriaPrimaCurrencyEditable')
  ]

  definition = [
    new Column('Id', 'id',null,true),
    new Column('Produtos', 'Descricao',null,true),
    
    new Column('Sacaria', 'UnidadeMedida'),
    
    new Column('Custo Saco (receita)', 'getCustoReceitaCurrency'),
    new Column('Custo Saco (contabil)', 'CustoMateriaPrimaCurrency'),
    new Column('Qtd Saco/ton', 'getSacoTon'),
    new Column('Custo por ton', 'getCustoMateriaTonCurrency'),

    //Credito pis cofgins
    new Column('(%) PIS/COFINS (Compra)', 'creditoTaxaPisCofinsPercentEditable'),
    new Column('(-) PIS/COFINS', 'getCreditoPisCofinsCurrency'),

    new Column('(%) Perdas', 'perdasPercentEditable'),
    new Column('Perdas', 'getPerdasCurrency'), //Reduzido pelo percentual de credito do pis e cofins

    new Column('(R$) GGF/TON', 'custoGgfToneladaEditable'),

    //Absolutos
    new Column('(R$) Filantropia/ton', 'caridadeCurrencyEditable'),
    new Column('(R$) Despesas/ton', 'despesasCurrencyEditable'),

    new Column('(%) Juros', 'financeiroPercentEditable'),
    new Column('Juros', 'getJurosCurrency'),


    //Impostos na venda
    new Column('(%) PIS/COFINS (Venda)', 'debitoTaxaPisCofinsPercentEditable'),
    new Column('PIS/COFINS', 'debitoPisCofinsCurrency'),

    new Column('(%) Comissão', 'tabelaPercentEditable'),
    new Column('Comissão', 'custoComissaoCurrency'),

    //Margem
    new Column('(%) Margem', 'margemPercentEditable'),
    new Column('Margem (Ton)', 'maregemPorToneladaCurrency'),
    
    //Preco recomendado para venda
    new Column('Preço Ton', 'precoComRepasseCurrency'),
    new Column('Preço SC', 'getPrecoSacoCurrency'),

    //Lucro bruto?
    new Column('Resultado SC', 'mergemLiquidaSacoCurrency'),
  ]

  action(action : ActionReturn){
    if(action.type == "delete"){
      const index = this.analise.produtos.findIndex(obj => obj.ItemCode == action.data.ItemCode)
      this.analise.produtos.splice(index, 1);
    }
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
  }

  voltar(): void {
    this.close.emit();
  }

}
