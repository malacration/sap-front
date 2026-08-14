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

  @Input()
  showHeader = true

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
    // So reage quando "show" de fato mudou nesse ciclo. Sem esse guard, QUALQUER
    // outro @Input mudando (ex.: [title] com um valor dinamico) tambem dispara
    // ngOnChanges, e como "show" fica sempre false em quem abre via
    // @ViewChild().openModal() direto (sem usar o binding [show]), o "else"
    // fechava o modal um instante depois de aberto.
    if (changes["show"] == undefined) {
      return
    }
    if (this.show) {
      this.openModal()
    } else {
      this.closeModal()
    }
  }

  openModal() {
    this.subscriptions?.unsubscribe()

    this.modalRef = this.modalService.show(this.template, {
      class: this.classeModal || `modal-dialog modal-${this.modalSize}`
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
