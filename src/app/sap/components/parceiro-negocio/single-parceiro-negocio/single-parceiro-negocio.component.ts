import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { BusinessPartnerService } from '../../../../modulos/sap-shared/_services/business-partners.service';
import { BPAddress, BusinessPartner } from '../../../model/business-partner/business-partner';
import { LocalidadeService } from '../../../../modulos/sap-shared/_services/localidade.service';
import { AlertService } from '../../../../shared/service/alert.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { OrderSalesService } from '../../../../modulos/sap-shared/_services/documents/order-sales.service';
import { PedidoVenda } from '../../../model/document/pedido-venda.model';
import { ContaReceber } from '../../../model/contas-receber.model';
import { Page } from '../../../model/page.model';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { PixService } from '../../../service/pix.service';
import { Icons } from '../../../../shared/icons';
import { SalesPerson } from '../../../model/sales-person/sales-person';
import { VendaFuturaService } from '../../../service/venda-futura.service';
import { VendaFutura } from '../../../model/venda/venda-futura';
import { SalesPersonService } from '../../../service/sales-person.service';

@Component({
  selector: 'app-parceiro-negocio-single',
  templateUrl: './single-parceiro-negocio.component.html',
  styleUrls: ['./single-parceiro-negocio.component.scss'],
})
export class ParceiroNegocioSingleComponent implements OnInit {
  constructor(
    private businessPartnerService: BusinessPartnerService,
    private orderSales: OrderSalesService,
    private pixService: PixService,
    private localidadeService: LocalidadeService,
    private vendaFuturaService: VendaFuturaService,
    private salesPersonService: SalesPersonService,
    private alert: AlertService,
    private router: Router
  ) {}

  readonly icons = Icons;

  @Input()
  selected: BusinessPartner = null;
  pageContent: Page<ContaReceber> = { content: [] } as Page<ContaReceber>;
  loading = false;
  pedidoVenda: Array<PedidoVenda> = [];
  pedidoVendaPage: Page<PedidoVenda> = new Page();
  pedidoVendaLoading = false;
  cotacoes: Array<PedidoVenda> = [];
  cotacoesPage: Page<PedidoVenda> = new Page();
  cotacoesLoading = false;
  contratosVendaFutura: Array<VendaFutura> = [];
  contratosVendaFuturaPage: Page<VendaFutura> = new Page();
  contratosVendaFuturaLoading = false;
  contratoVendaFuturaStatus: 'aberto' | 'entregue' | 'concluido' | 'cancelado' = 'aberto';
  pedidoDetalhe: PedidoVenda = null;
  cotacaoDetalhe: PedidoVenda = null;
  contratoDetalhe: VendaFutura = null;
  vendedorParceiroNome: string = null;
  contasReceber = Array();
  contasReceberLoading = false;
  contasReceberEmpty = false;
  @Output()
  close = new EventEmitter();
  
  autorizadoPixSemJuros = true; // Hardcode padrão
  
  qrCodeData: any = null;
  pixCopiado = false;
  linkPixCopiado = false;
  pagamentoPixData: any = null;
  contaPixAtual: ContaReceber = null;
  abasCarregadas = {
    cotacoes: false,
    pedidos: false,
    notas: false,
    contratosVendaFutura: false,
    contasReceber: false,
  };

  @ViewChild('retirada', { static: true }) buscaModal: ModalComponent;
  @ViewChild('modalPix') modalPix: ModalComponent;
  @ViewChild('modalPagamentoPix') modalPagamentoPix: ModalComponent;
  @ViewChild('modalLocalidade') modalLocalidade: ModalComponent;

  ngOnInit(): void {
    this.carregarNomesLocalidades();
    this.carregarNomeVendedorParceiro();
  }

  pedidoFiltro: any = { status: 'bost_Open', docNum: null, dataInicial: null, dataFinal: null, salesPersonCode: null };
  cotacaoFiltro: any = { status: 'bost_Open', docNum: null, dataInicial: null, dataFinal: null, salesPersonCode: null };

  ativarAba(tabTitle: string) {
    if (tabTitle === 'Cotações' && !this.abasCarregadas.cotacoes) {
      this.abasCarregadas.cotacoes = true;
      this.loadCotacoes(0);
    }

    if (tabTitle === 'Pedido de Venda' && !this.abasCarregadas.pedidos) {
      this.abasCarregadas.pedidos = true;
      this.loadPedidos(0);
    }

    if (tabTitle === 'Notas') {
      this.abasCarregadas.notas = true;
    }

    if (tabTitle === 'Contrato Venda Futura' && !this.abasCarregadas.contratosVendaFutura) {
      this.abasCarregadas.contratosVendaFutura = true;
      this.loadContratosVendaFutura();
    }

    if (tabTitle === 'Contas a Receber' && !this.abasCarregadas.contasReceber) {
      this.abasCarregadas.contasReceber = true;
      this.loadContasReceber();
    }
  }

  loadPedidos(page = 0) {
    this.pedidoVendaLoading = true;
    this.businessPartnerService
      .getPedidodeVendaBP(this.selected.CardCode, page, this.filtroDocumentoParams(this.pedidoFiltro))
      .subscribe({
        next: (response) => {
          this.pedidoVendaPage = response;
          this.pedidoVenda = response.content || [];
          if(this.pedidoDetalhe && !this.pedidoVenda.some(it => it.DocEntry === this.pedidoDetalhe.DocEntry))
            this.pedidoDetalhe = null;
        },
        complete: () => this.pedidoVendaLoading = false,
        error: () => this.pedidoVendaLoading = false,
      });
  }

  loadCotacoes(page = 0) {
    this.cotacoesLoading = true;
    this.businessPartnerService
      .getCotacoesBP(this.selected.CardCode, page, this.filtroDocumentoParams(this.cotacaoFiltro))
      .subscribe({
        next: (response) => {
          this.cotacoesPage = response;
          this.cotacoes = response.content || [];
          if(this.cotacaoDetalhe && !this.cotacoes.some(it => it.DocEntry === this.cotacaoDetalhe.DocEntry))
            this.cotacaoDetalhe = null;
        },
        complete: () => this.cotacoesLoading = false,
        error: () => this.cotacoesLoading = false,
      });
  }

  loadContratosVendaFutura() {
    this.contratosVendaFuturaLoading = true;
    this.vendaFuturaService
      .getAll('-1', '-1', this.contratoVendaFuturaStatus, this.selected.CardCode)
      .subscribe({
        next: (response) => {
          this.contratosVendaFuturaPage = response;
          this.contratosVendaFutura = response.content || [];
          if(this.contratoDetalhe && !this.contratosVendaFutura.some(it => it.DocEntry === this.contratoDetalhe.DocEntry))
            this.contratoDetalhe = null;
        },
        complete: () => this.contratosVendaFuturaLoading = false,
        error: () => this.contratosVendaFuturaLoading = false,
      });
  }

  carregarMaisContratosVendaFutura() {
    if(!this.contratosVendaFuturaPage?.nextLink) return;
    this.contratosVendaFuturaLoading = true;
    this.vendaFuturaService.getNextLink(this.contratosVendaFuturaPage.nextLink).subscribe({
      next: (response) => {
        this.contratosVendaFutura = [...this.contratosVendaFutura, ...(response.content || [])];
        this.contratosVendaFuturaPage = response;
      },
      complete: () => this.contratosVendaFuturaLoading = false,
      error: () => this.contratosVendaFuturaLoading = false,
    });
  }

  selecionaVendedorPedido(vendedor: SalesPerson) {
    this.pedidoFiltro.salesPersonCode = vendedor?.SalesEmployeeCode || null;
  }

  selecionaVendedorCotacao(vendedor: SalesPerson) {
    this.cotacaoFiltro.salesPersonCode = vendedor?.SalesEmployeeCode || null;
  }

  vendedorParceiro(): string {
    return this.selected?.SalesEmployeeName
      || this.vendedorParceiroNome
      || (this.temVendedorParceiro() ? String(this.selected.SalesPersonCode) : 'Nenhum vendedor');
  }

  selecionarPedidoDetalhe(pedido: PedidoVenda) {
    this.pedidoDetalhe = this.pedidoDetalhe?.DocEntry === pedido.DocEntry ? null : pedido;
  }

  selecionarCotacaoDetalhe(cotacao: PedidoVenda) {
    this.cotacaoDetalhe = this.cotacaoDetalhe?.DocEntry === cotacao.DocEntry ? null : cotacao;
  }

  selecionarContratoDetalhe(contrato: VendaFutura) {
    this.contratoDetalhe = this.contratoDetalhe?.DocEntry === contrato.DocEntry ? null : contrato;
  }

  private carregarNomeVendedorParceiro() {
    if(this.selected?.SalesEmployeeName || !this.temVendedorParceiro())
      return;
    this.salesPersonService.get(this.selected.SalesPersonCode).subscribe({
      next: (vendedor) => this.vendedorParceiroNome = vendedor?.SalesEmployeeName?.toString(),
      error: () => {},
    });
  }

  private temVendedorParceiro(): boolean {
    return this.selected?.SalesPersonCode != null && Number(this.selected.SalesPersonCode) >= 0;
  }

  private filtroDocumentoParams(filtro: any) {
    return {
      status: filtro.status || null,
      docNum: filtro.docNum,
      dataInicial: filtro.dataInicial,
      dataFinal: filtro.dataFinal,
      salesPersonCode: filtro.salesPersonCode,
    };
  }

loadContasReceber() {
    this.contasReceberLoading = true;
    
    this.businessPartnerService
      .getContasReceberBP(this.selected.CardCode)
      .subscribe({
        next: (response) => { 
          this.pageContent = response;
          
          this.contasReceber = response.content.map(it => {
            const conta = Object.assign(new ContaReceber(), it);
            conta.autorizadoPixSemJuros = this.autorizadoPixSemJuros; 
            return conta;
          });

          this.contasReceberEmpty = this.contasReceber.length === 0;
        }, 
        error: () => {
          this.contasReceberEmpty = true;
        },
        complete: () => {
          this.contasReceberLoading = false;
        },
      });
  }

changePageFunction(nextLink: string) {
  this.loading = true;

  this.businessPartnerService
    .getContasReceberNextLink(nextLink)
    .subscribe({
      next: (it) => {
        const novos = it.content.map(x => Object.assign(new ContaReceber(), x));
        this.pageContent.nextLink = it.nextLink;
        this.contasReceber = [...this.contasReceber, ...novos];

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
}

  voltar() {
    this.close.emit();
  }

  action(event: ActionReturn) {
    if (event.type === 'gerarPix') {
        this.solicitarPix(event.data, true);
    } else if (event.type === 'gerarPixSemJuros') {
        this.solicitarPix(event.data, false);
    } else if (event.type === 'exibirPix') {
        // Título já possui PIX: reutiliza o mesmo fluxo para exibir o QR existente
        this.solicitarPix(event.data, true);
    } else if (event.type === 'compartilharLinkPix') {
      this.compartilharLinkPix(event.data);
    } else if (event.type === 'checarPagamento') {
      this.checarPagamento(event.data)
    }
}

  compartilharLinkPix(conta?: ContaReceber) {
    if (conta) {
      this.copiarLinkPixConta(conta);
      return;
    }

    if (!this.qrCodeData) return;
    navigator.clipboard.writeText(this.montarLinkPix(
      this.qrCodeData.qrCodeCopyPaste,
      this.qrCodeData.total,
      this.qrCodeData.expirationDate,
    ));
    this.linkPixCopiado = true;
    setTimeout(() => this.linkPixCopiado = false, 3000);
  }

  private copiarLinkPixConta(conta: ContaReceber): void {
    conta.loadingPix = true;
    this.pixService
      .gerarPix(conta.PixDocType, conta.CreatedBy, conta.SourceLine)
      .subscribe({
        next: (res) => {
          if (!res || res.length !== 1) {
            throw new Error('PIX retornou múltiplos itens');
          }
          const item = res[0];
          const valorTitulo = Number(item.ValorTitulo ?? item.Total ?? 0);
          const juros = Number(item.JurosValor ?? 0);
          const valorTotal = Number(item.ValorTotal ?? item.Total ?? valorTitulo + juros);
          const qrCode = item.U_QrCodePix || item.U_pix_textContent;
          const vencimento = item.U_pix_due_date ?? item.DueDate;

          if (qrCode) {
            navigator.clipboard.writeText(this.montarLinkPix(qrCode, valorTotal, vencimento));
            conta.U_pix_reference = item.U_pix_reference ?? conta.U_pix_reference;
            conta.pixGerado = true;
          }
        },
        error: () => {
          conta.loadingPix = false
        },
        complete: () => {
          conta.loadingPix = false
        },
      });
  }

  private montarLinkPix(qrCode: string, valor: number, vencimento: string): string {
    const payload = {
      qrCode,
      valor,
      vencimento,
      nome: this.selected?.CardName,
    };
    const encoded = btoa(JSON.stringify(payload));
    return `${window.location.origin}/pix-link?d=${encoded}`;
  }

  copiarPix() {
    if (this.qrCodeData && this.qrCodeData.qrCodeCopyPaste) {
      navigator.clipboard.writeText(this.qrCodeData.qrCodeCopyPaste);
      this.pixCopiado = true;
    }
  }

  solicitarPix(conta: ContaReceber, comJuros: boolean) {
    conta.loadingPix = true
    this.contaPixAtual = conta;
    this.pixCopiado = false;
    this.linkPixCopiado = false;
    this.pixService
      .gerarPix(conta.PixDocType, conta.CreatedBy, conta.SourceLine, comJuros)
      .subscribe({
        next: (res) => {
          if (!res || res.length !== 1) {
            throw new Error('PIX retornou múltiplos itens');
          }
          const item = res[0];
          const juros = Number(item.JurosValor ?? 0);
          const valorTitulo = Number(item.ValorTitulo ?? item.Total ?? 0);
          const valorTotal = Number(item.ValorTotal ?? item.Total ?? valorTitulo + juros);
          this.qrCodeData = {
            qrCodeCopyPaste: item.U_QrCodePix,
            expirationDate: item.U_pix_due_date ?? item.DueDate,
            total: valorTotal,
            valorTitulo,
            juros,
          };
          conta.U_pix_reference = item.U_pix_reference ?? conta.U_pix_reference;
          conta.pixGerado = true;
          this.modalPix.openModal();
        },
        error: () => {
          conta.loadingPix = false
        },
        complete: () => {
          conta.loadingPix = false
        },
      });
  }

  checarPagamento(conta: ContaReceber){
    this.pixService
      .checarPix(conta.PixDocType, conta.CreatedBy, conta.SourceLine)
      .subscribe((res) => {
        this.pagamentoPixData = res;
        this.modalPagamentoPix.openModal();
      });
  }


  openModal() {
    this.buscaModal.classeModal = 'modal-xl';
    this.buscaModal.openModal();
  }

  closeModal($event) {
    this.buscaModal.closeModal();
  }

  get totalContasReceber(): number {
    if (!this.contasReceber || this.contasReceber.length === 0) return 0;

    return this.contasReceber
      .map((c) => Number(c.Debit || 0) - Number(c.Credit || 0)) // se existir crédito, desconta
      .reduce((acc, val) => acc + val, 0);
  }

  //---- localidade do endereco de entrega ----

  enderecoEditando: BPAddress = null;
  localidadeNomes: { [code: string]: string } = {};

  isEntrega(endereco: BPAddress): boolean {
    return endereco?.AddressType == 'bo_ShipTo';
  }

  tipoEndereco(endereco: BPAddress): string {
    if (endereco?.AddressType == 'bo_ShipTo') return 'Entrega';
    if (endereco?.AddressType == 'bo_BillTo') return 'Cobrança';
    return endereco?.AddressType || '-';
  }

  nomeLocalidade(endereco: BPAddress): string {
    if (!endereco?.U_Localidade) return '-';
    return this.localidadeNomes[endereco.U_Localidade] || String(endereco.U_Localidade);
  }

  //as linhas do SAP guardam apenas o codigo, buscamos os nomes para exibir
  private carregarNomesLocalidades() {
    const codigos = (this.selected?.BPAddresses || [])
      .map((it) => it.U_Localidade)
      .filter((it) => !!it);
    new Set(codigos).forEach((codigo) => {
      this.localidadeService.get(codigo).subscribe({
        next: (it) => (this.localidadeNomes[codigo] = it?.Name),
        error: () => {},
      });
    });
  }

  editarLocalidade(endereco: BPAddress) {
    this.enderecoEditando = endereco;
    this.modalLocalidade.openModal();
  }

  selecionaLocalidade($event) {
    if (!$event || !this.enderecoEditando) return;
    this.salvaLocalidade(Number($event.Code));
  }

  limpaLocalidade() {
    this.salvaLocalidade(null);
  }

  private salvaLocalidade(codigo: number) {
    const endereco = this.enderecoEditando;
    this.loading = true;
    this.businessPartnerService
      .setLocalidadeEndereco(this.selected.CardCode, endereco.AddressName, codigo)
      .subscribe({
        next: (pn) => {
          this.selected.BPAddresses = pn.BPAddresses;
          this.enderecoEditando = null;
          this.modalLocalidade.closeModal();
          this.carregarNomesLocalidades();
        },
        error: (e) => {
          this.loading = false;
          this.alert.error(e?.error?.message || 'Não foi possível salvar a localidade');
        },
        complete: () => (this.loading = false),
      });
  }

  pedidoVendaDefinition = [
    new Column('Número do Pedido', 'DocNum'),
    new Column('Data do Pedido', 'dataCriacao'),
    new Column('Total do Pedido', 'totalCurrency'),
  ];

  linhasPedidoDefinition = [
    new Column('Item', 'ItemCode'),
    new Column('Descrição', 'ItemDescription'),
    new Column('Quantidade', 'Quantity'),
    new Column('Preço', 'precoUnitarioCurrency'),
    new Column('Total', 'lineTotalCurrency'),
  ];

  contratoItensDefinition = [
    new Column('Item', 'U_itemCode'),
    new Column('Descrição', 'U_description'),
    new Column('Quantidade', 'U_quantity'),
    new Column('Preço Negociado', 'precoNegociadoCurrency'),
    new Column('Total', 'totalCurrency'),
  ];

  contasReceberDefinition = [
    new Column('Nota', 'Ref1'),
    new Column('Tipo de documento', 'Documento'),
    new Column('Parcela', 'SourceID'),
    new Column('Data de Lançamento', 'refDateFormat'),
    new Column('Data de Vencimento', 'dueDateFormat'),
    new Column('Filial', 'filialFormatada'),
    new Column('Histórico', 'LineMemo'),
    new Column('Valor', 'totalCurrency'),
  ];
}
