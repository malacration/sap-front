import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  encapsulation: ViewEncapsulation.None
})
export class ModalComponent implements OnChanges, OnDestroy {
  
  @Input()
  @Output()
  show = false
  
  @Output() showChange = new EventEmitter<boolean>();

  
  @Input()
  classeModal : string = undefined

  @Input()
  title = "Titulo"

  @Input() modalSize: 'sm' | 'lg' | 'xl' = 'xl';
  
  @Output()
  actionOutput : EventEmitter<any> = new EventEmitter<any>()

  @ViewChild('template') template;
  
  modalRef?: BsModalRef;

  subscriptions : Subscription

  modalAtualizarCustos = false

  constructor(
    private modalService: BsModalService, 
    private cdr: ChangeDetectorRef){
  }
  
  ngOnDestroy(): void {
    this.subscriptions?.unsubscribe()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(this.show && changes["show"] != undefined){
      this.openModal()
    }
    else if(!this.show){
      this.closeModal()
    }
      
  }
 
  openModal() {
    this.subscriptions?.unsubscribe()

    this.modalRef = this.modalService.show(this.template, {
      class: `modal-dialog modal-${this.modalSize}`
    });
    
    this.subscriptions = this.modalRef?.onHidden?.subscribe(() => {
      this.showChange.emit(false);
      this.cdr.detectChanges();
    })
  }

  closeModal() {
    this.modalRef?.hide()
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges();
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      modalContent.scrollTop = modalContent.scrollHeight;
    }
  }

  forceDetectChanges(){
    this.cdr.detectChanges()
  }
}