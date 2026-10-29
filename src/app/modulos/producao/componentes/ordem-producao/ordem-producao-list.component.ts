import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Column } from '../../../../shared/components/table/column.model';
import { Page } from '../../../../sap/model/page.model';
import { OrdemProducao, STATUS_ORDEM_PRODUCAO } from '../../_model/ordem-producao';
import { OrdemProducaoService } from '../../_services/ordem-producao.service';
import { OrdemProducaoPdfService } from '../../_services/ordem-producao-pdf.service';

@Component({
  selector: 'app-ordem-producao-list',
  templateUrl: './ordem-producao-list.component.html',
})
export class OrdemProducaoListComponent implements OnInit {

  opcoesStatus = STATUS_ORDEM_PRODUCAO
  // Abre nas ordens em andamento; nada marcado no filtro = todas.
  statusSelecionados : Array<string> = ['PLANEJADA', 'LIBERADA']

  pagina : Page<OrdemProducao> = new Page<OrdemProducao>()
  paginaAtual = 0
  carregando = false
  gerandoEmbalagem = false

  definition : Column[] = [
    new Column('Nº', 'DocumentNumber').withClick(),
    new Column('Produto', 'produto').withWrap(),
    new Column('Status', 'status'),
    new Column('Planejado', 'PlannedQuantity'),
    new Column('Concluído', 'CompletedQuantity'),
    new Column('Rejeitado', 'RejectedQuantity'),
    new Column('Depósito', 'Warehouse'),
    new Column('Lançamento', 'lancamento'),
    new Column('Vencimento', 'vencimento'),
    new Column('Observação', 'Remarks').withWrap(),
  ]

  constructor(
    private service : OrdemProducaoService,
    private pdf : OrdemProducaoPdfService,
    private router : Router,
    private route : ActivatedRoute) {}

  // Filtro e pagina vivem na URL: voltar do detalhe reabre a listagem como estava.
  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap
    if(query.has('status'))
      this.statusSelecionados = query.getAll('status').filter(it => it != '-')
    this.carregar(Number(query.get('page')) || 0)
  }

  aoSelecionarStatus(status : Array<string>) {
    this.statusSelecionados = status ?? []
    this.carregar(0)
  }

  abrir(evento : { item : OrdemProducao }) {
    this.router.navigate(['/producao/ordens', evento.item.AbsoluteEntry])
  }

  // Emissao em lote: um bloco de embalagem por ordem da pagina que esta na tela. Busca o detalhe de
  // cada uma porque sacaria, peso do saco e validade vem do cadastro, que a listagem nao traz.
  embalagemDaPagina() {
    const ordens = this.pagina?.content ?? []
    if(!ordens.length)
      return
    this.gerandoEmbalagem = true
    forkJoin(ordens.map(it => this.service.detalhe(it.AbsoluteEntry))).subscribe({
      next: detalhes => {
        this.gerandoEmbalagem = false
        this.pdf.abrir(this.pdf.ordemEmbalagem(detalhes), 'Ordens_Embalagem')
      },
      error: () => this.gerandoEmbalagem = false
    })
  }

  carregar(page : number) {
    this.paginaAtual = page
    // "-" marca "nenhum status" (todos), para nao cair no padrao de planejada/liberada ao voltar.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: this.statusSelecionados.length ? this.statusSelecionados : ['-'], page },
      replaceUrl: true,
    })
    this.carregando = true
    this.service.listar(page, this.statusSelecionados).subscribe({
      next: pagina => {
        this.pagina = pagina
        this.carregando = false
      },
      error: () => this.carregando = false
    })
  }
}
