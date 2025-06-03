import { ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { Produto } from '../../models/produto';
import { Analise } from '../../models/analise';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { ActionReturn } from '../../../../shared/components/action/action.model';

@Component({
  selector: 'formacao-preco',
  templateUrl: './formacao.component.html',
})
export class FormacaoPrecoStatementComponent implements OnInit {
  
  constructor(private cdRef: ChangeDetectorRef){

  }

  @ViewChild('custoMercadoria', {static: true}) custoModal: ModalComponent;
  @ViewChild('modalAdicionarItem', {static: true}) adicionarItemModal: ModalComponent;
  

  @Input()
  analise : Analise

  page = 0
  pageSize = 10
  
  qtdPlanejada = 1
  
  uniqueIngredients : Map<string, Produto> = new Map<string, Produto>()

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

  modelAdicioanrItem($event){
    this.adicionarItemModal.openModal()
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

    new Column('GGF/TON', 'getCustoGgfToneladaCurrency'),
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

