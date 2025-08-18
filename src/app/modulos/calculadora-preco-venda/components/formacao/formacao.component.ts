import { ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { Produto } from '../../models/produto';
import { Analise } from '../../models/analise';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { ItemService } from '../../../../sap/service/item.service';
import { LastPrice } from '../../models/last-price';
import { Observable, concat, finalize, tap } from 'rxjs';
import { CalculadoraService } from '../../service/calculadora.service';
import { AlertService } from '../../../../sap/service/alert.service';

@Component({
  selector: 'formacao-preco',
  templateUrl: './formacao.component.html',
})
export class FormacaoPrecoStatementComponent implements OnInit {
  
  constructor(
    private cdRef: ChangeDetectorRef,
    private service : CalculadoraService,
    private alertService : AlertService
    ){

  }

  @ViewChild('custoMercadoria', {static: true}) custoModal: ModalComponent;
  @ViewChild('modalAdicionarItem', {static: true}) adicionarItemModal: ModalComponent;
  @ViewChild('modalAtualizaCustosAcabado', {static: true}) modalAtualizaCustosAcabado: ModalComponent;
  

  @Input()
  analise : Analise

  page = 0
  pageSize = 10
  
  qtdPlanejada = 1
  
  uniqueIngredients : Map<string, Produto> = new Map<string, Produto>()
  showModalAtualizaCustosAcabado = false

  ngOnInit(): void {
    let fatorSubProduto = 40
  }

  onToggleCustoSap(){
    this.analise.produtos.forEach(it => it.useCustoSap = !it.useCustoSap)
  }

  isCustoSap() : boolean{
    return this.analise.produtos[0].useCustoSap
  }

  modalChangeCustos($event){
    this.groupUniqueIngredients()
    this.custoModal.openModal()
  }

  modalAdicioanrItem($event){
    this.adicionarItemModal.openModal()
  }

  modalAtualizarCustos($event){
    this.totalProgressBar = this.analise.produtos.length
    this.showModalAtualizaCustosAcabado = true
  }

  tipoCustosAcabado = "-1"
  loadingCustosAcabado = false
  totalProgressBar = 0
  currentProgressBar = 0
  
  atualizaCustosAcabado(){
    this.loadingCustosAcabado = true
    this.totalProgressBar = this.analise.produtos.length
    this.cdRef.detectChanges()
    

    if(this.tipoCustosAcabado == "-1"){
      this.loadingCustosAcabado = false
      return this.alertService.error("Informe um tipo de custo")
    }

    const requests: Observable<LastPrice[]>[] = this.analise.produtos.map(produto =>
      this.service.getLastPrice(produto.ItemCode).pipe(
        tap((result: LastPrice[]) => {
          if(this.tipoCustosAcabado == 'precoAnalisado'){
            produto.CustoMateriaPrimaCurrency = result[0]?.LstEvlPric ?? 0; 
          }
          else if(this.tipoCustosAcabado == 'precoCompra'){
            produto.CustoMateriaPrimaCurrency = result[0]?.LastPurPrc ?? 0;
          }
            this.currentProgressBar++;
        })
      )
    );

    concat(...requests)
      .pipe(
        finalize(() => {
          this.loadingCustosAcabado = false;
          this.showModalAtualizaCustosAcabado = false
          this.currentProgressBar = 0
        })
      )
      .subscribe({
        next: result => {
          // caso precise processar o resultado de cada requisição
        },
        error: err => {
          console.error('Erro ao buscar preços', err);
          this.loadingCustosAcabado = false;
        }
      });
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
        if (!this.uniqueIngredients.has(ingrediente.ItemCode)) {
          let produto = new Produto()
          produto.ItemCode = ingrediente.ItemCode
          produto.Descricao = ingrediente.Descricao
          produto.custoMateriaPrimaCurrencyEditable = ingrediente.custoMateriaPrimaCurrencyEditable
          this.uniqueIngredients.set(ingrediente.ItemCode, produto);
        }
      });
    });
  }

  getArrayUniqueIngredients(){
    return Array.from(this.uniqueIngredients.values());
  }

  changeCustoAllProdutos(){
    this.analise.produtos.forEach(produto => {
      produto.Ingredientes.forEach(it => {
        it.custoMateriaPrimaCurrencyEditable = this.uniqueIngredients.get(it.ItemCode).custoMateriaPrimaCurrencyEditable
      })
    });
    this.cdRef.detectChanges();
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
    new Column('Custo Saco (media)', 'CustoMateriaPrimaCurrency'),
    new Column('Qtd Saco/ton', 'getSacoTon'),
    new Column('Custo por ton', 'getCustoMateriaTonCurrency'),

    //Credito pis cofgins
    new Column('(%) PIS/COFINS (Compra)', 'creditoTaxaPisCofinsPercentEditable'),
    new Column('(-) PIS/COFINS', 'getCreditoPisCofinsCurrency'),

    new Column('(%) Perdas', 'perdasPercentEditable'),
    new Column('Perdas', 'getPerdasCurrency'), //Reduzido pelo percentual de credito do pis e cofins

    new Column('GGF/TON', 'custoGgfToneladaEditable'),
    //Margem
    new Column('(%) Margem', 'margemPercentEditable'),
    new Column('Margem', 'getMargemCurrency'),

    //Absolutos
    new Column('(R$) Filantropia/ton', 'caridadeCurrencyEditable'),
    new Column('(R$) Premiação/ton', 'premiacaoCurrencyEditable'),

    // Financeiro
    new Column('(%) Financeiro', 'financeiroPercentEditable'),
    new Column('(%) Marketing', 'marketingPercentEditable'),
    new Column('(%) Tabela', 'tabelaPercentEditable'),

    //Impostos na venda
    new Column('(%) PIS/COFINS (Venda)', 'debitoTaxaPisCofinsPercentEditable'),
    new Column('Base PIS/COFINS', 'basePisCofinsCurrency'),
    
    new Column('PIS/COFINS', 'debitoPisCofinsCurrency'),
    new Column('PIS/COFINS Liquido', 'getLiquidoPisCofinsCurrency'),

    
    //Preco recomendado para venda
    new Column('Preço Por Ton', 'getPrecoTonCurrency'),
    new Column('Preço Por SC', 'getPrecoSacoCurrency'),

    //Lucro bruto?
    new Column('Resultado por Ton', 'getResultadoCurrency'),
  ]

  action(action : ActionReturn){
    if(action.type == "delete"){
      const index = this.analise.produtos.findIndex(obj => obj.ItemCode == action.data.ItemCode)
      this.analise.produtos.splice(index, 1);
    }
  }

}

