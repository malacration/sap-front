import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ModalComponent {
  
  @Input()
  show = false
  modalRef?: BsModalRef;
  
  @Output()
  actionOutput : EventEmitter<any> = new EventEmitter<any>()

  constructor(private modalService: BsModalService){

  }

  title = "Titulo"
  @ViewChild('template') template;
 
  openModal() {
    this.modalRef = this.modalService.show(this.template);
  }

  closeModal() {
    this.modalService.hide();
  }

}