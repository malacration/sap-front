import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { formatCurrency } from '@angular/common';
import Big from 'big.js';

@Component({
  selector: 'desconto',
  templateUrl: './desconto.component.html',
  styleUrls: ['./desconto.component.scss'],
})
export class DescontoComponent {

  //TODO input
  @Input()
  valor
  desconto : number = 0

  @Output()
  descontoPercentual : EventEmitter<any> = new EventEmitter<any>();

  tipoDesconto: string = 'percentual';
  valorDesconto: number | null = null;

  @ViewChild('digitacao', {static: true}) descontoModal: ModalComponent;

  constructor(private ref: ChangeDetectorRef){
  }

  onTipoDescontoChange(tipo: string) {
    if(this.tipoDesconto == 'percentual' && tipo == 'absoluto')
      this.desconto=Big(1).minus(this.percentual).times(this.valor).toFixed(4, Big.roundHalfUp)
    else(this.tipoDesconto == 'absoluto' && tipo == 'percentual' )
      this.desconto=this.porcentagemDesconto
    
      
    this.tipoDesconto = tipo;
    this.ref.detectChanges()
  }
  
  get placeHolderDesconto() : string{
    return this.tipoDesconto == 'percentual' ? 'Digite o desconto em %' : 'Digite o desconto em R$'

  }

  get valorCurrency() {
    return formatCurrency(this.valor, 'pt', 'R$');
  } 

  get resultadoCurrency(){
    return formatCurrency(this.resultado, 'pt', 'R$');
  }

  get resultado() : Big{
    let aux : Big = Big(1)
    if(this.tipoDesconto == 'percentual'){
      //TODO arrumar depois
      aux = Big(this.valor).times((1-(this.desconto/100)))
    }
    else{
      aux = this.valor - this.desconto
    }  
    return Big(aux).toFixed(4, Big.roundHalfUp);
  }

  //Esse valor e o percentual que deve ser atribuido ao preco
  get percentual() : Big{
    console.log(this.resultado,"resultado")
    return Big(this.resultado).div(Big(this.valor).toFixed(6, Big.roundHalfUp))
  }

  get porcentagemDesconto() : Big{
    console.log(this.percentual,"percentual")
    return Big(1).minus(this.percentual).times(100).toFixed(4, Big.roundHalfUp)
  }

  confirmarDesconto(){
    this.descontoPercentual.emit(this.porcentagemDesconto)
    this.descontoModal.closeModal()
  }

  cancelar(){
    this.descontoModal.closeModal()
  }

  openModal(){
    this.descontoModal.openModal()
  }
}