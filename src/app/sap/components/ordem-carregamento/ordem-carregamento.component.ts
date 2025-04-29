import { Component, OnInit, ViewChild } from '@angular/core';
import { Branch } from '../../model/branch';
import { BusinessPartner } from '../../model/business-partner/business-partner';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-ordem-carregamento',
  templateUrl: './ordem-carregamento.component.html',
  styleUrls: ['./ordem-carregamento.component.scss']
})
export class OrdemCarregamentoComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  nomeOrdemCarregamento: string = ''
  dataInicial: Date
  dataFinal: Date
  isOn = false;
  branchId
  selectedBranch
  localidadeId
  selectedLocalidade

  @ViewChild('previewModal', { static: true }) previewModal: ModalComponent;
  
  limparDataInicial() {
    this.dataInicial = null;
  }

  limparDataFinal() {
    this.dataFinal = null;
  }
  
  filtrarPedidos() {
    //TODO passar os parametros e ao clicar no filtrar via retornar pra lista
  }

  consultarEstoque() {
    this.previewModal.openModal();
  }

  toggle() {
    this.isOn = !this.isOn;
  }

  selectBranch(branch: Branch){
    this.branchId = branch.bplid;
    this.selectedBranch = branch; 
  }

  selectLocalidade(bp: BusinessPartner){
    this.localidadeId = bp.U_Localidade;
    this.selectedLocalidade = bp; 
  }

  sendOrder(){
    // TODO relizar criacao de Ordem de Carregamento
  }
}
