import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Column } from '../../../../shared/components/table/column.model';
import { OrdemProducao, numeroBr } from '../../_model/ordem-producao';
import { OrdemProducaoService } from '../../_services/ordem-producao.service';
import { OrdemProducaoPdfService } from '../../_services/ordem-producao-pdf.service';

@Component({
  selector: 'app-ordem-producao-detalhe',
  templateUrl: './ordem-producao-detalhe.component.html',
})
export class OrdemProducaoDetalheComponent implements OnInit {

  ordem : OrdemProducao
  linhas : Array<any> = []
  carregando = false
  numeroBr = numeroBr

  definition : Column[] = [
    new Column('Código', 'ItemNo'),
    new Column('Matéria-prima', 'ItemName').withWrap(),
    new Column('kg / batida', 'kgBatida'),
    new Column('Previsto (kg)', 'previsto'),
    new Column('Consumido (kg)', 'consumido'),
    new Column('Depósito', 'Warehouse'),
  ]

  constructor(
    private route : ActivatedRoute,
    private router : Router,
    private location : Location,
    private service : OrdemProducaoService,
    private pdf : OrdemProducaoPdfService) {}

  ngOnInit(): void {
    this.carregando = true
    this.service.detalhe(Number(this.route.snapshot.paramMap.get('id'))).subscribe({
      next: ordem => {
        this.ordem = ordem
        this.linhas = ordem.materiasPrimas.map(linha => ({
          ...linha,
          kgBatida: numeroBr(ordem.kgPorBatida(linha), 3),
          previsto: numeroBr(linha.PlannedQuantity, 3),
          consumido: numeroBr(linha.IssuedQuantity, 3),
        }))
        this.carregando = false
      },
      error: () => this.carregando = false
    })
  }

  // Volta pelo historico para a listagem reabrir com o filtro e a pagina que estavam na URL.
  // Aberto direto (link colado, nova aba) nao tem para onde voltar: vai para a listagem.
  voltar(evento : Event) {
    evento.preventDefault()
    if(window.history.length > 1)
      this.location.back()
    else
      this.router.navigate(['/producao/ordens'])
  }

  pdfOrdemProducao() {
    this.pdf.abrir(this.pdf.ordemProducao([this.ordem]), `Ordem_Producao_${this.ordem.DocumentNumber}`)
  }

  pdfOrdemEmbalagem() {
    this.pdf.abrir(this.pdf.ordemEmbalagem([this.ordem]), `Ordem_Embalagem_${this.ordem.DocumentNumber}`)
  }
}
