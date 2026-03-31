import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DocumentLines, DocumentList } from '../../../../model/markting/document-list';
import { Column } from '../../../../../shared/components/table/column.model';
import { DocumentService } from '../documento.service';
import { GerarPixComponent } from '../../../../../shared/components/gerar-pix/gerar-pix.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { ActionReturn } from '../../../../../shared/components/action/action.model';
import { AlertService } from '../../../../../shared/service/alert.service';
import { PixPagamentoStatus, PixService } from '../../../../service/pix.service';
import { PixAdiantamento } from '../../../../model/markting/pix-adiantamento';
import { Page } from '../../../../model/page.model';

@Component({
  selector: 'app-document-list-single',
  templateUrl: './single-document-list.component.html',
  styleUrls: ['./single-document-list.component.scss']
})
export class DocumentListSingleComponent implements OnInit {

  @Input()
  title: string;

  @Input()
  service: DocumentService;

  @Input()
  selectedDocumentList: DocumentList = null;

  @Output()
  close = new EventEmitter();

  @ViewChild('modalPix') modalPix: GerarPixComponent;
  @ViewChild('modalPagamentoPix') modalPagamentoPix: ModalComponent;

  pixAdiantamentosPageData: Page<PixAdiantamento> = new Page<PixAdiantamento>();
  pixAdiantamentosLoading = false;
  pixAdiantamentosError = false;
  pixAdiantamentosPage = 0;
  readonly pixAdiantamentosDefaultPageSize = 20;
  pagamentoPixData: PixPagamentoStatus | null = null;
  pagamentoPixLoading = false;

  constructor(
    private pixService: PixService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.selectedDocumentList.DocumentLines = (this.selectedDocumentList.DocumentLines ?? []).map(it =>
      Object.assign(new DocumentLines(), it)
    );
    this.loadPixAdiantamentos();
  }

  voltar(){
    this.close.emit();
  }

  action(event: ActionReturn){
    if (event.type === 'consultar-status-pix-adiantamento') {
      this.consultarStatusPagamento(event);
    } else if (event.type === 'abrir-link-pix-adiantamento') {
      this.abrirLinkPixAdiantamento(event.data as PixAdiantamento);
    }
  }

  abrirPix() {
    this.modalPix.openModal();
  }

  onPixGerado() {
    this.loadPixAdiantamentos(this.pixAdiantamentosPage);
  }

  changePixAdiantamentosPage(page: number) {
    this.loadPixAdiantamentos(page);
  }

  get pixAdiantamentos(): PixAdiantamento[] {
    return this.pixAdiantamentosPageData.content ?? [];
  }

  get pixAdiantamentosPageSize(): number {
    return this.pixAdiantamentosPageData.size || this.pixAdiantamentosDefaultPageSize;
  }

  get hasOpenPixAdiantamento(): boolean {
    return this.pixAdiantamentos.some((item) => (item.Status ?? item.status) === 'bost_Open');
  }

  get podeGerarPixAdiantamento(): boolean {
    return !this.pixAdiantamentosLoading
      && !this.pixAdiantamentosError
      && !this.hasOpenPixAdiantamento
      && this.selectedDocumentList?.DocumentStatus === 'bost_Open'
      && this.selectedDocumentList?.DocObjectCode === 'oOrders';
  }

  private loadPixAdiantamentos(page = 0) {
    if (this.selectedDocumentList?.DocEntry == null) {
      this.pixAdiantamentosPageData = new Page<PixAdiantamento>();
      return;
    }

    this.pixAdiantamentosLoading = true;
    this.pixAdiantamentosError = false;
    this.pixAdiantamentosPage = page;

    this.pixService
      .listarAdiantamentosPedido(
        this.selectedDocumentList.DocEntry,
        page,
        this.pixAdiantamentosPageSize
      )
      .subscribe({
      next: (adiantamentosPage) => {
        this.pixAdiantamentosPageData = {
          ...adiantamentosPage,
          content: (adiantamentosPage?.content ?? []).map((item) =>
          Object.assign(new PixAdiantamento(), item)
          )
        };
      },
      error: () => {
        this.pixAdiantamentosPageData = new Page<PixAdiantamento>();
        this.pixAdiantamentosError = true;
        this.pixAdiantamentosLoading = false;
      },
      complete: () => {
        this.pixAdiantamentosLoading = false;
      }
    });
  }

  private consultarStatusPagamento(action: ActionReturn) {
    const item = action.data as PixAdiantamento;
    const status = item.Status ?? item.status;
    const docEntry = item.DocEntry ?? item.docEntry;
    const installmentId = item.InstallmentId ?? item.installmentId;

    if (status === 'bost_Open') {
      if (docEntry == null || installmentId == null) {
        this.alertService.error('Adiantamento Pix sem docEntry ou parcela para consulta.');
        return;
      }
    } else if (!item.U_pix_reference) {
      this.alertService.error('Adiantamento Pix sem referência para consulta rápida.');
      return;
    }

    action.carregando = true;
    item.checkingStatus = true;
    this.pagamentoPixLoading = true;
    this.pagamentoPixData = null;
    this.modalPagamentoPix.openModal();

    const consulta$ = status === 'bost_Open'
      ? this.pixService.checarPixAdiantamento(docEntry, installmentId)
      : this.pixService.consultarTransacao(item.U_pix_reference);

    consulta$.subscribe({
      next: (response) => {
        this.pagamentoPixData = response;
      },
      error: () => {
        action.carregando = false;
        item.checkingStatus = false;
        this.pagamentoPixLoading = false;
        this.alertService.error('Não foi possível consultar o status do pagamento PIX.');
      },
      complete: () => {
        action.carregando = false;
        item.checkingStatus = false;
        this.pagamentoPixLoading = false;
      }
    });
  }

  private abrirLinkPixAdiantamento(item: PixAdiantamento) {
    if (!item.pixLinkUrl) {
      return;
    }

    window.open(item.pixLinkUrl, '_blank');
  }


  definition = [
    new Column('Código do Item', 'ItemCode'),
    new Column('Descrição do Item', 'ItemDescription'),
    new Column('Quantidade do Item', 'quantityCurrency'),
    new Column('Preço Unitário', 'precoUnitarioCurrency'),
    new Column('Total da Linha', 'lineTotalCurrency')
  ];

  pixAdiantamentoDefinition = [
    new Column('Pix Ref.', 'pixReferenceLabel'),
    new Column('DocNum', 'docNumLabel'),
    new Column('Data de Expiração', 'expirationDateLabel'),
    new Column('Status Adiantamento', 'statusAdiantamento'),
    new Column('Valor do Pix', 'valorPix')
  ];
}
