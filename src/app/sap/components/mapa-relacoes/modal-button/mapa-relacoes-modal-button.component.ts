import { Component, Input, ViewChild } from '@angular/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mapa-relacoes-modal-button',
  templateUrl: './mapa-relacoes-modal-button.component.html',
})
export class MapaRelacoesModalButtonComponent {

  @Input() tipo: string = null
  @Input() docEntry: number = null
  @Input() label = 'Mapa de Relações'
  @Input() buttonClass = 'btn-outline-primary'
  @Input() buttonSize = 'btn-sm'

  aberto = false

  @ViewChild('mapaRelacoesModal', { static: true }) mapaRelacoesModal: ModalComponent

  abrir(){
    if(!this.tipo || !this.docEntry)
      return
    this.aberto = true
    this.mapaRelacoesModal.classeModal = 'modal-dialog modal-xl modal-mapa-relacoes-contrato'
    this.mapaRelacoesModal.openModal()
  }
}
