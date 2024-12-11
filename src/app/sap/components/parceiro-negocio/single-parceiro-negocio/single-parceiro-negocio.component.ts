import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { OrderSalesService } from '../../../service/document/order-sales.service';
import { PedidoVenda } from '../../document/documento.statement.component';



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
}