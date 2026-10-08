
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { LinhaItem, VendaFutura } from '../../../model/venda/venda-futura';

import { AlertService } from '../../../../shared/service/alert.service';
import { Option } from '../../../model/form/option';
import { VendaFuturaService } from '../../../service/venda-futura.service';
import { Item } from '../../../model/item';
import { PedidoTroca } from '../../../model/venda/pedido-troca';
import { ItemRetirada } from '../../../model/venda/item-retirada';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { CondicaoPagamento, CondicaoPagamentoService } from '../../../service/condicao-pagamento.service';
import { Observable, forkJoin } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Component({
  selector: 'app-venda-futura-troca',
  templateUrl: './troca.component.html',
  styleUrls: ['./troca.component.scss']
})
export class TrocaComponent implements OnInit {
  

  @Input() 
  vendaFutura: VendaFutura = new VendaFutura();

  branchId : number

  @ViewChild('selectComponent', {static: true}) selectComponent: SelectComponent;

  @Output()
  closeModal = new EventEmitter<any>();

  @Output()
  eventoTrocou = new EventEmitter<any>();

  loadingSalvar = false
  selectedItem: LinhaItem | null = null;
  quantity: number | null = null;
  itensRetirados: Array<ItemRetirada> = new Array();
  dtEntrega
  itensNovos : Array<Item> = new Array()

  //Condicao de pagamento do contrato aplicada aos produtos novos (ver aplicaCondicaoDoContrato).
  //pendenciasCondicao bloqueia a confirmacao: produto sem a condicao na tabela dele sairia sem
  //desconto, e o back recusaria a troca do mesmo jeito.
  carregandoCondicao = false
  pendenciasCondicao : Array<string> = []
  nomeCondicao : string = null
  private condicaoSeq = 0
  private prazosPorTabela = new Map<string, Observable<Array<CondicaoPagamento>>>()

  constructor(
    private alertService: AlertService,
    private service : VendaFuturaService,
    private condicaoPagamentoService : CondicaoPagamentoService){
  }

  ngOnInit(): void {
    this.branchId = this.vendaFutura.U_filial
  }

  get filteredItems(): Array<Option> {
    const retiradosCodes = this.itensRetirados.map(it => it.itemCode);
    return this.vendaFutura?.AR_CF_LINHACollection.filter(
      item => !retiradosCodes.includes(item.U_itemCode)
    ).filter(it => it.qtdDisponivel > 0).map(it => new Option(it,it.U_description+" - Qtd: "+it.qtdDisponivel));
  }

  selecionado($event){
    console.log($event)
    this.selectedItem = $event
  }

  validateEhAdiciona() {
    if (this.selectedItem && this.quantity && this.quantity > this.selectedItem.U_quantity) {
      this.alertService.info("A quantidade informada supera o saldo disponível do item. Corrija e tente novamente.");
    } else {
      this.adiciona();
    }
  }

  removerItem(index: number) {
    const itemRemovido = this.itensRetirados[index];
    this.itensRetirados.splice(index, 1);
  }


  adiciona() {
    if (this.selectedItem && this.quantity && this.quantity <= this.selectedItem.U_quantity) {
      this.itensRetirados.push(
        new ItemRetirada(
          this.selectedItem.U_itemCode,
          this.quantity,
          this.selectedItem.U_description,
          this.selectedItem.LineId,
          this.selectedItem.U_precoNegociado));
      console.log(this.selectedItem.U_precoNegociado)
      this.clearForm()
      console.log(this.itensRetirados)
    }
  }

  get podeConfirmar() : boolean {
    return !this.carregandoCondicao && (this.itensNovos?.length == 0 || this.pendenciasCondicao.length == 0)
  }

  salvarPedido(){
    if(!this.podeConfirmar){
      this.alertService.info(this.pendenciasCondicao.join('\n') || 'Aguarde o cálculo do desconto da condição de pagamento.')
      return
    }
    this.loadingSalvar = true
    let pedido = new PedidoTroca(
      this.vendaFutura.DocEntry,this.itensRetirados,
      this.itensNovos.map(it => it.getDocumentsLines(-1))
    )
    this.service.trocar(pedido).subscribe({
      next: (it) => {
        this.alertService.info("Troca realizada com sucesso. Os boletos serão ajustados automaticamente.").then(it =>{
          this.clearForm()
          this.closeModal.emit()
          this.eventoTrocou.emit()
        })
      }, 
      complete: () => {
          this.loadingSalvar=false
      },
      error: (error) => {
        this.loadingSalvar=false
      }
    })
  }

  clearForm(){
    this.selectedItem = null;
    this.quantity = null
    this.selectComponent.unselect()
  }

  changeItensNovos($event){
    this.itensNovos = $event
    this.aplicaCondicaoDoContrato()
  }

  /**
   * Aplica aos produtos novos o desconto/juros da condicao de pagamento do pedido original,
   * exatamente como a tela de venda faz (DocumentStatementComponent.changeCondicaoPagamento).
   * O percentual depende da tabela de preco de cada produto, por isso a busca e por tabela.
   */
  private aplicaCondicaoDoContrato(){
    const seq = ++this.condicaoSeq
    const condicao = this.vendaFutura?.U_condicaoPagamento
    if(condicao == null){
      this.carregandoCondicao = false
      this.pendenciasCondicao = ['O contrato não possui condição de pagamento. Feche e abra a troca novamente para atualizá-lo.']
      return
    }
    const tabelas = [...new Set(this.itensNovos.map(it => String(it.PriceList)))]
    if(tabelas.length == 0){
      this.carregandoCondicao = false
      this.pendenciasCondicao = []
      return
    }
    this.carregandoCondicao = true
    forkJoin(tabelas.map(tabela => this.prazosDaTabela(tabela).pipe(
      map(prazos => ({ tabela, prazo : prazos.find(it => String(it.GroupNum) == String(condicao)) }))
    ))).subscribe({
      next : resultado => {
        if(seq != this.condicaoSeq)
          return
        const pendencias = []
        this.itensNovos.forEach(item => {
          const prazo = resultado.find(it => it.tabela == String(item.PriceList))?.prazo
          item.GroupNum = prazo?.GroupNum ?? null
          item.descontoCondicaoPagamento = prazo?.U_desconto ?? 0
          item.jurosCondicaoPagamento = prazo?.U_juros ?? 0
          if(prazo)
            this.nomeCondicao = prazo.PymntGroup
          else
            pendencias.push(`${item.ItemDescription}: a condição de pagamento do contrato não está disponível na tabela ${item.ListName || item.PriceList}.`)
        })
        this.pendenciasCondicao = pendencias
        this.carregandoCondicao = false
      },
      error : () => {
        if(seq != this.condicaoSeq)
          return
        this.carregandoCondicao = false
        this.pendenciasCondicao = ['Não foi possível carregar o desconto da condição de pagamento. Remova e adicione o produto novamente.']
      }
    })
  }

  /** Uma busca por tabela: a quantidade dispara recalculo por tecla. Falha nao fica em cache. */
  private prazosDaTabela(tabela : string) : Observable<Array<CondicaoPagamento>> {
    if(!this.prazosPorTabela.has(tabela)){
      const busca = this.condicaoPagamentoService.getByTabela(Number(tabela)).pipe(shareReplay(1))
      this.prazosPorTabela.set(tabela, busca)
      busca.subscribe({ error : () => this.prazosPorTabela.delete(tabela) })
    }
    return this.prazosPorTabela.get(tabela)
  }

  totalBalanco() : number{
    return this.totalNovosItens()-this.totalItensRetirada()
  }

  totalNovosItens() : number{
    if(this.itensNovos)
      return this.itensNovos.reduce((acc,it) => acc+it.unitPriceLiquid()*it.quantidade,0)
    else
      return 0
  }

  totalItensRetirada() : number{
    return this.itensRetirados.reduce((acc, it) => acc+it.precoNegociado*it.quantidade,0)
  }
}
