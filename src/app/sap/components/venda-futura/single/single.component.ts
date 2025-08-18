import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DownPaymentService } from '../../../service/DownPaymentService';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { Column } from '../../../../shared/components/table/column.model';
import { FutureDeliverySalesService } from '../../../service/FutureDeliverySales.service';
import {VendaFutura } from '../../../model/venda/venda-futura';
import { DocumentLines, FutureDeliverySales } from '../../../model/markting/future-delivery-sales';
import { GerarPdfComponent } from '../gerar-pdf/gerar-pdf.component';
import { AlertService } from '../../../service/alert.service';
import { VendaFuturaService } from '../../../service/venda-futura.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { delay, of } from 'rxjs';



@Component({
  selector: 'app-venda-futura-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class VendaFuturaSingleComponent implements OnInit {


  constructor(private downPaymentService : DownPaymentService,
    private alertService : AlertService,
    private vendaFuturaService : VendaFuturaService,
    private futureDeliverySalesService : FutureDeliverySalesService ){

  }

  cardName = "windson"
  id = "666"
  
  @Input() 
  selected: VendaFutura = null;

  boletos = Array()

  entregas = Array<DocumentLines>()

  pedidos = Array<DocumentLines>()

  loadingBoletos: boolean = true; 
  loadingEntregas: boolean = true; 
  loadingPedidos: boolean = true;

  @Output()
  close = new EventEmitter();

  @ViewChild('retirada', {static: true}) retiradaModal: ModalComponent;

  @ViewChild('troca', {static: true}) trocaModal: ModalComponent;

  @ViewChild(GerarPdfComponent) gerarPdfComponent: GerarPdfComponent;

  @ViewChild('previewModal', { static: true }) previewModal: ModalComponent;

  ngOnInit(): void {
    this.downPaymentService.getByContrato(this.selected.DocEntry).subscribe(it => {
      this.boletos = it;
      this.loadingBoletos = false;
    });


    this.selected.AR_CF_LINHACollection.forEach(it => {
      it.entregue = 0
      it.produtoEntregueLoading = true;
    });
    
    this.vendaFuturaService.getEntregas(this.selected.DocEntry).subscribe(response => {
      this.entregas = response.flatMap(entrega => 
        entrega.DocumentLines.map(line => {
          return Object.assign(new DocumentLines(), line, entrega)
        }));
        
        this.entregas.forEach(item => {
          let produto = this.selected.AR_CF_LINHACollection.find(it => it.U_itemCode == item.ItemCode.toString());
          if(produto)
            produto.entregue += item.formattedQuantityInvoice | 0
        });

        this.loadingEntregas = false; 
        
        this.selected.AR_CF_LINHACollection.forEach(it => {
          it.produtoEntregueLoading = false;
        });
    })

    this.futureDeliverySalesService.getPedidosByContrato(this.selected.DocEntry).subscribe(response => {
      this.pedidos = response.flatMap(entrega => 
        entrega.DocumentLines.map(line => {
          return Object.assign(new DocumentLines(), line, entrega)
        }));
        
        this.loadingPedidos = false; 
    })
  }

  loadingCriaBoletos = false
  confirmEmitirBoletos(){
    this.loadingCriaBoletos = true
    this.alertService.confirm("Emitir os boletos é uma ação irrevercivel, tem certeza que deseja continuar?")
    .then(it => {
      if(it.isConfirmed){
        this.vendaFuturaService.emitirBoletos(this.selected.DocEntry).subscribe({
          next(value) {
            this.alertService.info("Boleto Criado com sucesso")
          },
          complete() {
            this.loadingCriaBoletos = false    
          }
        })
      }else{
        this.loadingCriaBoletos = false
      }
    })
  }

  voltar(){
    this.close.emit()
  }

  abrirModalPreview() {
    this.previewModal.openModal();
  }
  
  gerarPDF() {
    const headContent = document.head.innerHTML;
    this.gerarPdfComponent.gerarPdf(headContent);
  }

  desfazerConcilicao(docEntry){
    this.alertService.confirm("Tem certeza que deseja cancelar o documento? Entry ["+docEntry+"]").then(it => {
      if(it.isConfirmed){
        this.alertService.loading(this.vendaFuturaService.cancelarConciliacao(docEntry)).then( it =>
          this.alertService.info("Documento liberado para cancelamento")
        )
      }
    })
  }

  action(event : ActionReturn){
    if(event.type == "devolver"){
      this.desfazerConcilicao(event.data.DocEntry)
    }
  }

  openModalRetirada(){
    this.retiradaModal.classeModal = "modal-xl"
    this.retiradaModal.openModal()
  }

  openModalTroca(){
    this.trocaModal.classeModal = "modal-xl"
    this.trocaModal.openModal()
  }


  closeModal($event){
    this.retiradaModal.closeModal()
    this.trocaModal.closeModal()
  }

  encerrarContrato(){
    this.alertService.confirm("Deseja encerrar o contrato?").then(it => {
      if(it.isConfirmed){
        this.alertService.loading(this.vendaFuturaService.encerrarContrato(this.selected.DocEntry)).then( it =>{
          this.alertService.info("Contrato encerrado com sucesso.");
        })
      }
    })
  }

  definition = [
    new Column('Código do Item', 'U_itemCode'),
    new Column('Descrição', 'U_description'),
    new Column('Preço Negociado', 'precoNegociadoCurrency'),
    new Column('Quantidade', 'U_quantity'),
    new Column('Qtd. Retirado', 'quantidadeEntregue'),
    new Column('Qtd. Disponível', 'qtdDisponivel'),
    new Column('Total', 'totalCurrency')
  ];

  boletosDefinition = [
    new Column('Código', 'DocNum'),
    new Column('Vencimento', 'vencimento'),
    new Column('Total', 'totalCurrency'),
    new Column('Status', 'situacaoBoleto'),
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
