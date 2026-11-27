import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, TemplateRef, ViewChild, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-modal',
    templateUrl: './modal.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ModalComponent implements OnChanges, OnDestroy {
  
  @Input()
  @Output()
  show = false
  
  @Output() showChange = new EventEmitter<boolean>();

  // Opt-in: quando ligado ao template (true/false), true impede o usuario de fechar (X, Escape, fundo); closeModal() do pai continua valendo.
  // Sem binding (undefined) o modal se comporta como sempre.
  @Input() fechamentoBloqueado: boolean | undefined = undefined

  
  @Input()
  classeModal : string = undefined

  @Input()
  title = "Titulo"

  @Input()
  showHeader = true

  // Opcional: id do titulo, usado como nome acessivel do dialog.
  @Input() ariaLabelledBy: string = undefined

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
    this.fechando = false

    this.modalRef = this.modalService.show(this.template, {
      class: this.classeModal || `modal-dialog modal-${this.modalSize}`,
      ariaLabelledBy: this.ariaLabelledBy,
      // Cobre Escape, fundo e voltar do navegador; lido a cada tentativa, entao acompanha o Input.
      closeInterceptor: this.fechamentoBloqueado === undefined ? undefined
        : () => {
          if (this.fechamentoBloqueado && !this.fechandoPeloPai) {
            return Promise.reject()
          }
          this.fechando = true
          return Promise.resolve()
        }
    });

    this.subscriptions = this.modalRef?.onHidden?.subscribe(() => {
      // Ref fechado nao serve mais: um hide() tardio nele mexeria no contador global de modais do ngx-bootstrap.
      this.modalRef = undefined
      this.fechando = false
      this.showChange.emit(false);
      this.cdr.detectChanges();
    })

  }

  // closeModal() do pai ignora o bloqueio (o Input pode ainda nao ter sido atualizado nesse ciclo).
  private fechandoPeloPai = false

  // Fechamento aceito e ainda sem onHidden (a animacao leva ~450 ms): um segundo hide() nessa janela
  // mexeria no contador global do ngx-bootstrap e derrubaria o backdrop de outro dialog aberto no meio.
  private fechando = false

  // Botao X do cabecalho.
  fecharPeloX() {
    if (this.fechando) {
      return
    }
    this.fechando = true
    this.modalRef?.hide()
  }

  closeModal() {
    if (!this.modalRef || this.fechando) {
      return
    }
    this.fechando = true
    this.fechandoPeloPai = true
    this.modalRef?.hide()
    this.fechandoPeloPai = false
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
