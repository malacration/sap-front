import { Component, OnInit } from '@angular/core';
import { Branch } from '../../model/branch';
import { BusinessPartner } from '../../model/business-partner/business-partner';

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
  
  limparDataInicial() {
    this.dataInicial = null;
  }

  limparDataFinal() {
    this.dataFinal = null;
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
}
