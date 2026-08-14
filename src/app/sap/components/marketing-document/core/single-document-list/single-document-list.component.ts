import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DocumentInstallment, DocumentLines, DocumentList } from '../../../../model/markting/document-list';
import { Column } from '../../../../../shared/components/table/column.model';
import { DocumentService } from '../documento.service';
import { GerarPixComponent } from '../../../../../shared/components/gerar-pix/gerar-pix.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { ActionReturn } from '../../../../../shared/components/action/action.model';
import { AlertService } from '../../../../../shared/service/alert.service';
import { PixPagamentoStatus, PixService } from '../../../../service/pix.service';
import { PixAdiantamento } from '../../../../model/markting/pix-adiantamento';
import { Page } from '../../../../model/page.model';
import { Icons } from '../../../../../shared/icons';
import { SalesPersonService } from '../../../../service/sales-person.service';
import { SalesPerson } from '../../../../model/sales-person/sales-person';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-document-list-single',
  templateUrl: './single-document-list.component.html',
  styleUrls: ['./single-document-list.component.scss']
})
export class DocumentListSingleComponent implements OnInit {

  readonly icons = Icons;

  @Input()
  title: string;

  @Input()
  service: DocumentService;

  @Input()
  selectedDocumentList: DocumentList = null;

  @Input()
  mapaRelacoesTipo : string = null

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
  vendedoresLinhas: SalesPerson[] = [];
  vendedoresLinhasLoading = false;

  constructor(
    private pixService: PixService,
    private alertService: AlertService,
    private salesPersonService: SalesPersonService
  ) {}

  linhasLoading = false;

  ngOnInit(): void {
    this.selectedDocumentList.DocumentLines = (this.selectedDocumentList.DocumentLines ?? []).map(it =>
      Object.assign(new DocumentLines(), it)
    );
    this.selectedDocumentList.DocumentInstallments = this.normalizaParcelas(this.selectedDocumentList);
    if (this.selectedDocumentList.DocumentLines.length === 0 && this.service?.getLinhas) {
      this.linhasLoading = true;
      this.service.getLinhas(this.selectedDocumentList.DocEntry).subscribe({
        next: (linhas) => {
          this.selectedDocumentList.DocumentLines = linhas.map(it => Object.assign(new DocumentLines(), it));
          this.resolverVendedoresDasLinhas();
        },
        complete: () => { this.linhasLoading = false; }
      });
    } else {
      this.resolverVendedoresDasLinhas();
    }
    if (this.isPedidoVenda)
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
      && (this.selectedDocumentList?.DocumentStatus === 'bost_Open' || this.selectedDocumentList?.DocumentStatus === 'O')
      && this.selectedDocumentList?.DocObjectCode === 'oOrders';
  }

  get isPedidoVenda(): boolean {
    return this.selectedDocumentList?.DocObjectCode === 'oOrders';
  }

  get possuiParcelas(): boolean {
    return (this.selectedDocumentList?.DocumentInstallments ?? []).length > 0;
  }

  get vendedoresLinhasLabel(): string {
    if(this.vendedoresLinhasLoading)
      return 'Carregando...'
    if(this.vendedoresLinhas.length === 0)
      return '-'
    return this.vendedoresLinhas
      .map(vendedor => vendedor?.SalesEmployeeName || vendedor?.SalesEmployeeCode)
      .join(', ')
  }

  private resolverVendedoresDasLinhas(){
    const codigos = Array.from(new Set(
      (this.selectedDocumentList?.DocumentLines ?? [])
        .map(line => Number(line.SalesPersonCode))
        .filter(code => Number.isFinite(code) && code >= 0)
    ));

    this.vendedoresLinhas = [];
    if(codigos.length === 0)
      return;

    this.vendedoresLinhasLoading = true;
    forkJoin(
      codigos.map(code => this.salesPersonService.get(code).pipe(
        catchError(() => of(Object.assign(new SalesPerson(), {
          SalesEmployeeCode: code,
          SalesEmployeeName: String(code),
        })))
      ))
    ).subscribe({
      next: (vendedores) => { this.vendedoresLinhas = vendedores; },
      complete: () => { this.vendedoresLinhasLoading = false; },
    });
  }

  private normalizaParcelas(documento: any): DocumentInstallment[] {
    return (documento?.DocumentInstallments ?? documento?.documentInstallments ?? []).map((item) =>
      Object.assign(new DocumentInstallment(), {
        ...item,
        InstallmentId: item.InstallmentId ?? item.installmentId,
        DueDate: item.DueDate ?? item.dueDate,
        total: item.total ?? item.Total,
        Total: item.Total ?? item.total,
        Percentage: item.Percentage ?? item.percentage,
        Status: item.Status ?? item.status,
        U_pix_reference: item.U_pix_reference ?? item.u_pix_reference,
      })
    );
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
    new Column('Preço Negociado', 'precoUnitarioCurrency'),
    new Column('Total da Linha', 'lineTotalCurrency')
  ];

  parcelasDefinition = [
    new Column('Parcela', 'parcela'),
    new Column('Vencimento', 'vencimento'),
    new Column('Valor', 'valorCurrency'),
    new Column('Percentual', 'percentual'),
    new Column('Status', 'statusFormatado'),
    new Column('Pix Ref.', 'pixReferencia')
  ];

  pixAdiantamentoDefinition = [
    new Column('Pix Ref.', 'pixReferenceLabel'),
    new Column('DocNum', 'docNumLabel'),
    new Column('Data de Expiração', 'expirationDateLabel'),
    new Column('Status Adiantamento', 'statusAdiantamento'),
    new Column('Valor do Pix', 'valorPix')
  ];
}
