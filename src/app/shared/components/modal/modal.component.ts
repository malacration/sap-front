import { ChangeDetectorRef, Component, EventEmitter, Input, Output, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ModalComponent {
  
  @Input()
  show = false
  @Input()
  classeModal : string = undefined

  modalRef?: BsModalRef;
  
  @Output()
  actionOutput : EventEmitter<any> = new EventEmitter<any>()

  constructor(private modalService: BsModalService, private cdr: ChangeDetectorRef){

  }

  @Input()
  title = "Titulo"

  @ViewChild('template') template;
 
  openModal() {
    this.modalRef = this.modalService.show(this.template,{
      class: this.classeModal
    });
  }

  closeModal() {
    this.modalRef.hide()
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges();
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      modalContent.scrollTop = modalContent.scrollHeight;
    }
  }
  

}