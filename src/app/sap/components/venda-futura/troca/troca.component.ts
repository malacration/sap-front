
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { LinhaItem, VendaFutura } from '../../../model/venda/venda-futura';

import { AlertService } from '../../../service/alert.service';
import { Option } from '../../../model/form/option';
import { SelectComponent } from '../../form/select/select.component';
import { VendaFuturaService } from '../../../service/venda-futura.service';
import { Item } from '../../../model/item';
import { PedidoTroca } from '../../../model/venda/pedido-troca';
import { ItemRetirada } from '../../../model/venda/item-retirada';

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

  loadingSalvar = false
  selectedItem: LinhaItem | null = null;
  quantity: number | null = null;
  itensRetirados: Array<ItemRetirada> = new Array();
  dtEntrega
  itensNovos : Array<Item> = new Array()

  constructor(
    private alertService: AlertService,
    private service : VendaFuturaService){
  }

  ngOnInit(): void {
    this.branchId = this.vendaFutura.U_filial
  }

  get filteredItems(): Array<Option> {
    const retiradosCodes = this.itensRetirados.map(it => it.itemCode);
    return this.vendaFutura.AR_CF_LINHACollection.filter(
      item => !retiradosCodes.includes(item.U_itemCode)
    ).filter(it => it.qtdDisponivel > 0).map(it => new Option(it,it.U_description+" - Qtd: "+it.qtdDisponivel));
  }

  selecionado($event){
    this.selectedItem = $event
  }

  validateEhAdiciona() {
    if (this.selectedItem && this.quantity && this.quantity > this.selectedItem.U_quantity) {
      this.alertService.info("Formulário inválido ou quantidade superior ao disponível.");
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
          this.selectedItem.U_description,this.selectedItem.U_precoNegociado));
      this.clearForm()
    }
  }

  salvarPedido(){
    this.loadingSalvar = true
    let pedido = new PedidoTroca(
      this.vendaFutura.DocEntry,this.itensRetirados,
      this.itensNovos.map(it => it.getDocumentsLines(-1))
    )
    this.service.trocar(pedido).subscribe({
      next: (it) => {
        this.alertService.info("Pedido de troca foi feito com sucesso").then(it =>{
          this.clearForm()
          this.closeModal.emit()
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
