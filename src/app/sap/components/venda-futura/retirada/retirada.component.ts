
import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { LinhaItem, VendaFutura } from '../../../model/venda/venda-futura';
import { Column } from '../../../../shared/components/table/column.model';
import { DownPaymentService } from '../../../service/DownPaymentService';

import * as $ from 'jquery';
import { AlertService } from '../../../../shared/service/alert.service';
import { Option } from '../../../model/form/option';
import { VendaFuturaService } from '../../../service/venda-futura.service';
import { ItemRetirada } from '../../../model/venda/item-retirada';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { BPAddress } from '../../../model/business-partner/business-partner';
import { BusinessPartnerService } from '../../../../modulos/sap-shared/_services/business-partners.service';

@Component({
    selector: 'app-venda-futura-retirada',
    templateUrl: './retirada.component.html',
    styleUrls: ['./retirada.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class RetiradaComponent implements OnInit {
  

  @Input() 
  vendaFutura: VendaFutura = new VendaFutura();

  @ViewChild('selectComponent', {static: true}) selectComponent: SelectComponent;

  @Output()
  retirados = new EventEmitter<Array<any>>();
  
  @Output()
  eventoRetirou = new EventEmitter<void>();

  loadingSalvar = false
  selectedItem: LinhaItem | null = null;
  quantity: number | null = null;
  itensRetirados: Array<ItemRetirada> = new Array();
  dtEntrega

  //Endereco de entrega da retirada. Pode ser outro endereco do cliente, desde que caia na mesma
  //regiao de frete do contrato - o back recusa se cair em outra, porque o frete foi negociado
  //para aquele destino.
  enderecosEntrega: Array<Option> = new Array();
  enderecoEntrega: BPAddress = null;
  carregandoEnderecos = false;

  constructor(
    private alertService: AlertService,
    private businessPartnerService : BusinessPartnerService,
    private service : VendaFuturaService){

  }

  ngOnInit(): void {
    this.carregaEnderecos()
  }

  /**
   * Enderecos de ENTREGA do cliente do contrato. O default e o primeiro, que era o
   * comportamento antigo - antes a tela nao escolhia nada e o SAP aplicava o endereco padrao.
   */
  private carregaEnderecos(){
    const cardCode = this.vendaFutura?.U_cardCode
    if(!cardCode)
      return
    this.carregandoEnderecos = true
    this.businessPartnerService.get(cardCode).subscribe({
      next : bp => {
        this.enderecosEntrega = bp.getAddressOptions('bo_ShipTo')
        this.enderecoEntrega = (this.enderecosEntrega[0]?.value as unknown as BPAddress) ?? null
        this.carregandoEnderecos = false
      },
      error : () => { this.carregandoEnderecos = false }
    })
  }

  selecionaEndereco($event){
    this.enderecoEntrega = $event
  }

  get filteredItems(): Array<Option> {
    // Filtra os itens que já foram retirados
    const retiradosCodes = this.itensRetirados.map(it => it.itemCode+'-'+it.LineId);
    return this.vendaFutura?.AR_CF_LINHACollection?.filter(
      item => item.qtdDisponivel > 0 && !retiradosCodes.includes(item.U_itemCode+'-'+item.LineId)
    )?.map(it => new Option(it,it.U_description+" - Qtd: "+it.qtdDisponivel));
  }

  selecionado($event){
    this.selectedItem = $event
  }

  validateEhAdiciona() {
    if (this.selectedItem && this.quantity && this.quantity > this.selectedItem.U_quantity) {
      this.alertService.info("A quantidade informada supera o saldo disponível do item. Corrija e tente novamente.");
    } else {
      this.adiciona();
    }
  }

  removerItem(index: number) {
    const itemRemovido = this.itensRetirados[index];
    this.itensRetirados.splice(index, 1);
  }


  adiciona() {
    if (this.selectedItem && this.quantity && this.quantity <= this.selectedItem.U_quantity) {
      this.itensRetirados.push(
        new ItemRetirada(
          this.selectedItem.U_itemCode,
          this.quantity,this.selectedItem.U_description,
          this.selectedItem.LineId)
      );
      console.log(this.itensRetirados)
      this.clearForm()
    }
  }

  salvarPedido(){
    this.loadingSalvar = true
    let pedidoRetireada = this.vendaFutura.getPedidoRetirada(
      this.itensRetirados, this.dtEntrega, this.enderecoEntrega?.AddressName)
    this.service.retirar(pedidoRetireada).subscribe({
      next : documento => {
        this.alertService.info("Retirada registrada com sucesso.").then(it => {
          this.retirados.emit(this.itensRetirados)
          this.eventoRetirou.emit()
          this.clearForm()
        })
      },
      error : () => {this.loadingSalvar = false},
      complete : () => {this.loadingSalvar = false}
    })
  }

  clearForm(){
    this.selectedItem = null;
    this.quantity = null
    this.selectComponent.unselect()
  }


}
