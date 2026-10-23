import { Component, ViewChild } from '@angular/core';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { BatchStockService } from '../../../../../modulos/sap-shared/_services/BatchStockService';
import { BatchStock } from '../../../../../modulos/sap-shared/_models/BatchStock.model';
import { Item } from '../../../../model/item';

/**
 * Lotes disponiveis do item no deposito padrao da filial, so para consulta na hora de vender: nao
 * seleciona nem reserva lote. A escolha do lote continua na ordem de carregamento.
 */
@Component({
  selector: 'app-lotes-item',
  templateUrl: './lotes-item.component.html',
})
export class LotesItemComponent {

  @ViewChild('modal', {static: true}) modal: ModalComponent;

  item : Item
  lotes : Array<BatchStock> = []
  loading = false
  erro = false

  /** Resposta de um item anterior que chegar atrasada nao pode ocupar o modal do item atual. */
  private consulta = 0

  constructor(private batchStockService : BatchStockService){
  }

  abrir(item : Item){
    this.item = item
    this.lotes = []
    this.erro = false
    this.loading = true
    const consulta = ++this.consulta
    this.modal.openModal()
    this.batchStockService.get(item.ItemCode, item.WarehouseCode).subscribe({
      next: lotes => {
        if(consulta != this.consulta) return
        this.lotes = lotes
        this.loading = false
      },
      error: () => {
        if(consulta != this.consulta) return
        this.erro = true
        this.loading = false
      }
    })
  }

  get titulo() : string {
    return this.item ? `Lotes disponíveis - ${this.item.ItemCode} - ${this.item.ItemDescription}` : 'Lotes disponíveis'
  }

  get totalDisponivel() : number {
    return this.lotes.reduce((total, lote) => total + (lote.Quantity ?? 0), 0)
  }

  /** O SQLQueries devolve data como yyyyMMdd ou ISO; a tela mostra dd/MM/yyyy. */
  data(valor : string | null) : string {
    if(!valor)
      return '-'
    const digitos = valor.substring(0, 10).replace(/-/g, '')
    if(digitos.length != 8)
      return valor
    return `${digitos.substring(6, 8)}/${digitos.substring(4, 6)}/${digitos.substring(0, 4)}`
  }
}
