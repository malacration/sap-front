import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { OrderSalesService } from '../../../service/document/order-sales.service';
import { PedidoVenda } from '../../document/documento.statement.component';
import { ContaReceber } from '../../../model/contas-receber.model';



@Component({
  selector: 'app-parceiro-negocio-single',
  templateUrl: './single-parceiro-negocio.component.html',
  styleUrls: ['./single-parceiro-negocio.component.scss']
})
export class ParceiroNegocioSingleComponent implements OnInit {


  constructor(
    private businessPartnerService : BusinessPartnerService, 
    private orderSales : OrderSalesService ){

  }

  @Input() 
  selected: BusinessPartner = null;

  pedidoVenda = Array()
  contasReceber = Array()
  contasReceberLoading = false;
  contasReceberEmpty = false;
  @Output()
  close = new EventEmitter();

  @ViewChild('retirada', {static: true}) buscaModal: ModalComponent;

  ngOnInit(): void {
    this.businessPartnerService.getPedidodeVendaBP(this.selected.CardCode).subscribe(response => {
      this.pedidoVenda = response.map(pedidoVenda => {
        return {
          DocNum: pedidoVenda.DocNum,
          DocDate: pedidoVenda.DocDate,
          DocTotal: pedidoVenda.DocTotal
        }; 
      });
      this.pedidoVenda = this.pedidoVenda.map(pedidoVenda => Object.assign(new PedidoVenda(), pedidoVenda));
    });
     this.contasReceberLoading = true;
  this.businessPartnerService.getContasReceberBP(this.selected.CardCode).subscribe({
    next: (response) => {
      this.contasReceber = response.map(c => Object.assign(new ContaReceber(), {
        TransId: c.TransId,
        Documento:c.documento,
        Ref1: c.Ref1,
        RefDate: c.RefDate,
        DueDate: c.DueDate,
        Debit: c.Debit,
        Credit: c.Credit,
        LineMemo: c.LineMemo,
        BPLName: c.BPLName,
        TransType: c.TransType
      }));
      this.contasReceberEmpty = this.contasReceber.length === 0;
    },
    error: () => {
      this.contasReceberEmpty = true;
    },
    complete: () => {
      this.contasReceberLoading = false;
    }
  });
  }
  

  voltar(){
    this.close.emit()
  }

  action($event){

  }

  openModal(){
    this.buscaModal.classeModal = "modal-xl"
    this.buscaModal.openModal()
  }


  closeModal($event){
    this.buscaModal.closeModal()
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
   new Column('Tipo de documento', 'Documento'),
  new Column('Data de Lançamento', 'refDateFormat'),
  new Column('Data de Vencimento', 'dueDateFormat'),
  new Column('Filial', 'BPLName'),
  new Column('Histórico', 'LineMemo'),
  new Column('Valor', 'totalCurrency'),
];
}