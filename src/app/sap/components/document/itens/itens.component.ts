import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Item } from '../../../model/item';
import { ComissaoService } from '../../../../modulos/sap-shared/_services/comissao.service';
import { Comissao } from '../../../model/comissao';

@Component({
  selector: 'card-itens',
  templateUrl: './itens.component.html',
  styleUrls: ['./itens.component.scss'],
})
export class ItensComponent implements OnInit {

  itens = new Array<Item>()
  showThumbnail = false

  //cache da Comissao vinculada a cada tabela de preco (Item.PriceList), pra saber o
  //desconto maximo permitido por item na tela de Vender
  private comissaoPorTabela : { [tabela : string] : Comissao } = {}

  @Input()
  branchId = undefined

  @Input()
  geralLoading = false

  @Input()
  title = "Produtos"

  @Output()
  changeItens = new EventEmitter<Array<Item>>();

  constructor(private comissaoService : ComissaoService){
  }

  ngOnInit(): void {

  }

  private carregarComissao(tabela : string){
    if(!tabela || this.comissaoPorTabela[tabela] !== undefined)
      return
    this.comissaoPorTabela[tabela] = null
    this.comissaoService.getByIdTabela(Number(tabela)).subscribe({
      next : (it) => this.comissaoPorTabela[tabela] = it,
      error : () => this.comissaoPorTabela[tabela] = null
    })
  }

  descontoMaximoDoItem(item : Item) : number {
    const comissao = item?.PriceList ? this.comissaoPorTabela[item.PriceList] : null
    return comissao?.U_desconto ?? null
  }

  total() : number{
    return this.itens.reduce((acc, it) => acc+it.unitPriceLiquid()*it.quantidade,0)
  }

  addItem(item){
    if(!item) return;
    item.quantidade = 1
    this.itens.push(item)
    this.carregarComissao(item.PriceList)
    this.changeItens.emit(this.itens)
  }

  //o [(ngModel)] da quantidade altera o item no lugar, entao o pai nao tem
  //como perceber sozinho - sem esse emit o frete (que depende da quantidade
  //total) ficava parado no valor calculado quando o item foi adicionado
  quantidadeChange(){
    this.changeItens.emit(this.itens)
  }

  remover(item){
    var index = this.itens.indexOf(item);
    if (index !== -1) {
      this.itens.splice(index, 1);
      this.changeItens.emit(this.itens)
    }
  }

  arredondarParaTroco(){
    this.aplicarDescontoCentavos()
  }

  //Esse metodo gera valores totalmente inconsistentes, nao acredito que seria adequado
  aplicarDescontoCentavos() {
    // 1. Extrair centavos do total
    const centavos = Math.round((this.total() * 100) % 100);

    // 2. Achar o item com menor valor total
    const itemMaisBarato = this.itens.reduce((menor, atual) => {
      return atual.totalSemFormatacao() < menor.totalSemFormatacao() ? atual : menor;
    });
  
    // 3. Calcular o desconto percentual necessário
    const descontoPercentual = parseFloat(((centavos / itemMaisBarato.unitPriceLiquid())).toFixed(4));

    if(descontoPercentual > 0)
      itemMaisBarato.descontoVendedorPorcentagem = itemMaisBarato.descontoVendedorPorcentagem+descontoPercentual
    // 4. Aplicar o desconto ao item escolhido
    alert(descontoPercentual)
  }
  
}