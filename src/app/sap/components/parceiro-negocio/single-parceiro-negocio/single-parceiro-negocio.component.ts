import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { BusinessPartnerService } from '../../../../modulos/sap-shared/_services/business-partners.service';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { OrderSalesService } from '../../../../modulos/sap-shared/_services/documents/order-sales.service';
import { PedidoVenda } from '../../document/documento.statement.component';
import { ContaReceber } from '../../../model/contas-receber.model';
import { Page } from '../../../model/page.model';

@Component({
  selector: 'app-parceiro-negocio-single',
  templateUrl: './single-parceiro-negocio.component.html',
  styleUrls: ['./single-parceiro-negocio.component.scss'],
})
export class ParceiroNegocioSingleComponent implements OnInit {
  constructor(
    private businessPartnerService: BusinessPartnerService,
    private orderSales: OrderSalesService
  ) {}

  @Input()
  selected: BusinessPartner = null;
  pageContent: Page<ContaReceber> = { content: [] } as Page<ContaReceber>;
  loading = false;
  pedidoVenda = Array();
  contasReceber = Array();
  contasReceberLoading = false;
  contasReceberEmpty = false;
  @Output()
  close = new EventEmitter();

  @ViewChild('retirada', { static: true }) buscaModal: ModalComponent;

  ngOnInit(): void {
    this.businessPartnerService
      .getPedidodeVendaBP(this.selected.CardCode)
      .subscribe((response) => {
        this.pedidoVenda = response.map((pedidoVenda) => {
          return {
            DocNum: pedidoVenda.DocNum,
            DocDate: pedidoVenda.DocDate,
            DocTotal: pedidoVenda.DocTotal,
          };
        });
        this.pedidoVenda = this.pedidoVenda.map((pedidoVenda) =>
          Object.assign(new PedidoVenda(), pedidoVenda)
        );
      });
    this.loadContasReceber();
  }

  loadContasReceber() {
    this.contasReceberLoading = true;
    this.businessPartnerService
      .getContasReceberBP(this.selected.CardCode)
      .subscribe({
        next: (response) => {
        this.pageContent = response;
        this.contasReceber = response.content.map(it => Object.assign(new ContaReceber(), it));
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

  action($event) {}

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

  definition = [
    new Column('Tipo Endereço', 'AddressName'),
    new Column('Tipo', 'TypeOfAddress'),
    new Column('Rua', 'Street'),
    new Column('Bairro', 'Block'),
    new Column('Número', 'StreetNo'),
    new Column('CEP', 'ZipCode'),
    new Column('Cidade', 'City'),
    new Column('Estado', 'State'),
    new Column('País', 'Country'),
  ];

  pedidoVendaDefinition = [
    new Column('Número do Pedido', 'DocNum'),
    new Column('Data do Pedido', 'dataCriacao'),
    new Column('Total do Pedido', 'totalCurrency'),
  ];

  contasReceberDefinition = [
    new Column('Nota', 'Ref1'),
    new Column('Tipo de documento', 'documento'),
    new Column('Data de Lançamento', 'refDateFormat'),
    new Column('Data de Vencimento', 'dueDateFormat'),
    new Column('Filial', 'filialFormatada'),
    new Column('Histórico', 'LineMemo'),
    new Column('Valor', 'totalCurrency'),
  ];
}
