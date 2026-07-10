import { Component, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { BoletoVf, DownPaymentService } from '../../../service/DownPaymentService';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { FutureDeliverySalesService } from '../../../service/FutureDeliverySales.service';
import { VendaFutura } from '../../../model/venda/venda-futura';
import { DocumentLines, FutureDeliverySales } from '../../../model/markting/future-delivery-sales';
import { GerarPdfComponent } from '../gerar-pdf/gerar-pdf.component';
import { AlertService } from '../../../../shared/service/alert.service';
import { VendaFuturaService } from '../../../service/venda-futura.service';
import { PixPagamentoStatus, PixService } from '../../../service/pix.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { Icons } from '../../../../shared/icons';



@Component({
  selector: 'app-venda-futura-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class VendaFuturaSingleComponent implements OnInit {

  readonly icons = Icons;

  constructor(
    private downPaymentService: DownPaymentService,
    private alertService: AlertService,
    private vendaFuturaService: VendaFuturaService,
    private futureDeliverySalesService: FutureDeliverySalesService,
    private pixService: PixService,
  ) {}

  @Input()
  selected: VendaFutura = null;

  boletos: BoletoVf[] = [];
  entregas = Array<DocumentLines>();
  entregasDocs = Array<FutureDeliverySales>();
  pedidos = Array<DocumentLines>();

  vincularDevolucaoDocNum: number = null;
  vincularNotaSaidaDocEntry: number = null;
  vinculandoDevolucao = false;

  // Grupo de ações aberto no momento ('financeiro' | 'produtos' | 'reversoes' | null)
  menuAberto: string | null = null;

  toggleMenu(nome: string): void {
    this.menuAberto = this.menuAberto === nome ? null : nome;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.acoes-dropdown')) {
      this.menuAberto = null;
    }
  }

  loadingBoletos = true;
  loadingEntregas = true;
  loadingPedidos = true;
  gerarPixLoading = false;

  pixConsultandoMap: { [key: string]: boolean } = {};
  copiadoSet: { [key: string]: boolean } = {};

  @Output()
  close = new EventEmitter();

  @ViewChild('retirada', { static: true }) retiradaModal: ModalComponent;
  @ViewChild('troca', { static: true }) trocaModal: ModalComponent;
  @ViewChild('vincularDevolucao', { static: true }) vincularDevolucaoModal: ModalComponent;
  @ViewChild(GerarPdfComponent) gerarPdfComponent: GerarPdfComponent;
  @ViewChild('previewModal', { static: true }) previewModal: ModalComponent;
  @ViewChild('modalPagamentoPix', { static: true }) modalPagamentoPix: ModalComponent;

  pagamentoPixData: PixPagamentoStatus | null = null;
  pagamentoPixLoading = false;

  ngOnInit(): void {
    this.loadingBoletos = true;
    this.loadingEntregas = true;
    this.loadingPedidos = true;

    this.carregarBoletos();

    this.selected?.AR_CF_LINHACollection?.forEach(it => {
      it.entregue = 0;
      it.produtoEntregueLoading = true;
    });

    this.vendaFuturaService.getEntregas(this.selected.DocEntry).subscribe(response => {
      this.entregasDocs = response;
      this.entregas = response.flatMap(entrega =>
        entrega.DocumentLines.map(line => Object.assign(new DocumentLines(), line, entrega))
      );

      this.entregas.forEach(item => {
        const candidatos = this.selected?.AR_CF_LINHACollection?.filter(
          it => it.U_itemCode == item.ItemCode?.toString()
        ) ?? [];
        const produto = candidatos.length === 1
          ? candidatos[0]
          : candidatos.find(it => Math.abs(it.U_precoNegociado - (item.U_preco_negociado ?? 0)) < 0.01);
        if (produto)
          produto.entregue += Number(item.formattedQuantityInvoice) || 0;
      });

      this.loadingEntregas = false;
      this.selected?.AR_CF_LINHACollection?.forEach(it => {
        it.produtoEntregueLoading = false;
      });
    });

    this.futureDeliverySalesService.getPedidosByContrato(this.selected.DocEntry).subscribe(response => {
      this.pedidos = response.flatMap(entrega => 
        entrega.DocumentLines.map(line => {
          return Object.assign(new DocumentLines(), line, entrega)
        }));
        
        this.loadingPedidos = false; 
    })
  }

  carregarBoletos(): void {
    this.loadingBoletos = true;
    this.downPaymentService.getByContrato(this.selected.DocEntry).subscribe({
      next: (it) => { this.boletos = it; },
      complete: () => { this.loadingBoletos = false; }
    });
  }

  // ── PIX ──────────────────────────────────────────────────────────────────

  get podeGerarPix(): boolean {
    return this.boletos.some(b => b.DocStatus === 'O' && !b.U_pix_reference);
  }

  pixKey(boleto: BoletoVf): string {
    return `${boleto.DocEntry}-${boleto.InstallmentId}`;
  }

  possuiPix(boleto: BoletoVf): boolean {
    return Boolean(boleto.U_pix_reference);
  }

  gerarPixContrato(): void {
    this.gerarPixLoading = true;
    this.downPaymentService.gerarPixContrato(this.selected.DocEntry).subscribe({
      next: (boletos) => { this.boletos = boletos; },
      error: () => {
        this.alertService.info('Erro ao gerar PIX. Tente novamente.');
        this.gerarPixLoading = false;
      },
      complete: () => { this.gerarPixLoading = false; }
    });
  }

  consultarPix(boleto: BoletoVf): void {
    const key = this.pixKey(boleto);
    this.pixConsultandoMap[key] = true;
    this.pagamentoPixLoading = true;
    this.pagamentoPixData = null;
    this.modalPagamentoPix.openModal();

    const consulta$ = boleto.DocStatus === 'O'
      ? this.pixService.checarPixAdiantamento(boleto.DocEntry, boleto.InstallmentId)
      : this.pixService.consultarTransacao(boleto.U_pix_reference);

    consulta$.subscribe({
      next: (response) => {
        this.pagamentoPixData = response;
      },
      error: () => {
        this.pixConsultandoMap[key] = false;
        this.pagamentoPixLoading = false;
        this.alertService.info('Erro ao consultar pagamento. Tente novamente.');
      },
      complete: () => {
        this.pixConsultandoMap[key] = false;
        this.pagamentoPixLoading = false;
        this.recarregarBoletosBackground();
      }
    });
  }

  private recarregarBoletosBackground(): void {
    this.downPaymentService.getByContrato(this.selected.DocEntry).subscribe({
      next: (it) => { this.boletos = it; }
    });
  }

  isConsultando(boleto: BoletoVf): boolean {
    return this.pixConsultandoMap[this.pixKey(boleto)] ?? false;
  }

  copiarPix(boleto: BoletoVf): void {
    const texto = boleto.U_pix_textContent;
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    const key = this.pixKey(boleto);
    this.copiadoSet[key] = true;
    setTimeout(() => { this.copiadoSet[key] = false; }, 3000);
  }

  foiCopiado(boleto: BoletoVf): boolean {
    return this.copiadoSet[this.pixKey(boleto)] ?? false;
  }

  abrirLinkPix(boleto: BoletoVf): void {
    const qrCode = boleto.U_pix_textContent || boleto.U_QrCodePix;
    if (!qrCode) return;
    const payload = {
      qrCode,
      valor: parseFloat(boleto.DocTotal),
      vencimento: boleto.U_pix_due_date || boleto.DocDueDate,
      nome: this.selected?.U_cardName ?? null,
    };
    const encoded = btoa(JSON.stringify(payload));
    window.open(`${window.location.origin}/pix-link?d=${encoded}`, '_blank');
  }

  // ── Boletos ──────────────────────────────────────────────────────────────

  statusBoletoLabel(boleto: BoletoVf): string {
    return boleto.DocStatus === 'O' ? 'Aberto' : 'Pago/Cancelado';
  }

  // ── Emitir boletos ───────────────────────────────────────────────────────

  loadingCriaBoletos = false;
  confirmEmitirBoletos(): void {
    this.alertService.confirm('Ao emitir os boletos, os prazos de pagamento passam a valer imediatamente. Essa ação é irreversível. Confirmar emissão?')
      .then(it => {
        if (it.isConfirmed) {
          this.loadingCriaBoletos = true;
          this.vendaFuturaService.emitirBoletos(this.selected.DocEntry).subscribe({
            next: () => {
              this.alertService.info('Boletos emitidos com sucesso.');
            },
            error: () => {
              this.loadingCriaBoletos = false;
            },
            complete: () => {
              this.loadingCriaBoletos = false;
              this.ngOnInit();
            }
          });
        }
      });
  }

  // ── Navegação e modais ───────────────────────────────────────────────────

  voltar(): void { this.close.emit(); }

  abrirModalPreview(): void { this.previewModal.openModal(); }

  gerarPDF(): void {
    const headContent = document.head.innerHTML;
    this.gerarPdfComponent.gerarPdf(headContent);
  }

  desfazerConcilicao(docEntry): void {
    this.alertService.confirm('Deseja liberar a nota fiscal Nº ' + docEntry + ' para devolução? A conciliação com o pagamento será desfeita.').then(it => {
      if (it.isConfirmed) {
        this.alertService.loading(this.vendaFuturaService.cancelarConciliacao(docEntry)).then(() =>
          this.alertService.info('Nota fiscal liberada. Finalize a devolução diretamente no SAP B1.')
        );
      }
    });
  }

  action(event: ActionReturn): void {
    if (event.type === 'devolver') {
      this.desfazerConcilicao(event.data.DocEntry);
    }
  }

  openModalRetirada(): void {
    this.retiradaModal.classeModal = 'modal-xl';
    this.retiradaModal.openModal();
  }

  openModalTroca(): void {
    this.trocaModal.classeModal = 'modal-xl';
    this.trocaModal.openModal();
  }

  get notasSaida(): FutureDeliverySales[] {
    return this.entregasDocs.filter(d => d.DocObjectCode === 'oInvoices' && Number(d.U_vf_estornada) !== 1);
  }

  openModalVincularDevolucao(): void {
    this.vincularDevolucaoDocNum = null;
    this.vincularNotaSaidaDocEntry = null;
    this.vincularDevolucaoModal.classeModal = 'modal-lg';
    this.vincularDevolucaoModal.openModal();
  }

  confirmarVincularDevolucao(): void {
    if (!this.vincularDevolucaoDocNum || !this.vincularNotaSaidaDocEntry) {
      this.alertService.info('Informe o número da devolução e selecione a nota de saída.');
      return;
    }
    this.alertService.confirm(
      'Vincular a devolução Nº ' + this.vincularDevolucaoDocNum + ' a este contrato? ' +
      'Serão feitos o cancelamento da conciliação da reclassificação, a conciliação do cliente ' +
      'e a reversão da reclassificação. Essa ação faz lançamentos no SAP.'
    ).then(res => {
      if (!res.isConfirmed) return;
      this.vinculandoDevolucao = true;
      this.alertService.loading(
        this.vendaFuturaService.vincularDevolucao(
          this.selected.DocEntry,
          this.vincularDevolucaoDocNum,
          this.vincularNotaSaidaDocEntry,
        )
      ).then(() => {
        this.vinculandoDevolucao = false;
        this.vincularDevolucaoModal.closeModal();
        this.alertService.info('Devolução vinculada e conciliada com sucesso.');
        this.ngOnInit();
      }).catch(err => {
        this.vinculandoDevolucao = false;
        this.alertService.error(err?.error?.mensagem ?? 'Não foi possível vincular a devolução.');
      });
    });
  }

  closeModal($event): void {
    this.retiradaModal.closeModal();
    this.trocaModal.closeModal();
  }

  encerrarContrato(): void {
    this.alertService.confirm('Deseja cancelar este contrato? Essa ação é irreversível e encerrará todos os documentos vinculados.').then(it => {
      if (it.isConfirmed) {
        this.alertService.loading(this.vendaFuturaService.encerrarContrato(this.selected.DocEntry)).then(() => {
          this.alertService.info('Contrato cancelado com sucesso.');
        });
      }
    });
  }

  // ── Definições de tabela ─────────────────────────────────────────────────

  definition = [
    new Column('Código do Item', 'U_itemCode'),
    new Column('Descrição', 'U_description'),
    new Column('Preço Negociado', 'precoNegociadoCurrency'),
    new Column('Quantidade', 'U_quantity'),
    new Column('Qtd. Retirado', 'quantidadeEntregue'),
    new Column('Qtd. Disponível', 'qtdDisponivel'),
    new Column('Total', 'totalCurrency'),
  ];

  documentDefinition = [
    new Column('ID', 'DocNum'),
    new Column('Tipo de Nota', 'labelDocumentType'),
    new Column('Status', 'documentStatus'),
    new Column('Número da Nota', 'SequenceSerial'),
    new Column('Data de Emissão', 'formattedDocDate'),
    new Column('Código do Item', 'ItemCode'),
    new Column('Descrição do Item', 'ItemDescription'),
    new Column('Preço', 'U_preco_negociado'),
    new Column('Entregue', 'formattedQuantityInvoice'),
    new Column('Total', 'totalLinhaCurrency'),
  ];
}
