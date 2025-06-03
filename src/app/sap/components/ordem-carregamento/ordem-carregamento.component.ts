import { Component, OnInit } from '@angular/core';
import { SalesPersonService } from '../../service/sales-person.service';
import { AlertService } from '../../service/alert.service';
import { Router } from '@angular/router';
import { Branch } from '../../model/branch';
import { Localidade } from '../../model/localidade/localidade';
import { LocalidadeService } from '../../service/localidade.service';

@Component({
  selector: 'app-ordem-carregamento',
  templateUrl: './ordem-carregamento.component.html',
  styleUrls: ['./ordem-carregamento.component.scss']
})
export class OrdemCarregamentoComponent implements OnInit {

  // Nome Ordem de Carregamento
  nameOrdInput : string

  //  Data Inicial e Final

  dtInicial : string
  dtFinal : string
  
  // Selecionar Filial
  branchId
  selectedBranch: Branch = null;

  // Selecionar Localidade
  localidade : Localidade = null;


  constructor(
    private localidadeService: LocalidadeService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  // Selecionar Filial
  selectBranch(branch: Branch){
    this.branchId = branch.bplid;
    this.selectedBranch = branch; 
  }

  // Selecionar Localidade
  selectLocalidade($event){
    this.localidade = $event
    this.localidadeService.get(this.localidade.Code).subscribe(it =>{
        this.localidade = it
    })
  }

  // Btn Filtrar
  criarAnalise(){
    return alert(this.dtInicial + this.dtFinal + this.branchId + this.localidade)
  }

  // Botão filtrar não pode estar null 
  isnotNullFiltrar(){
    return this.branchId && this.localidade
  }
}