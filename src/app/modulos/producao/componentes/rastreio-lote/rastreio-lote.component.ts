import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LadoRastreio, MapaNode, MapaRelacoesResponse, mesclarNivel, SITUACAO_ORIGEM_DISPONIVEL } from '../../../../sap/model/mapa-relacoes';
import { AlertService } from '../../../../shared/service/alert.service';
import { dataBr } from '../../_model/ordem-producao';
import { OrdemProducaoService } from '../../_services/ordem-producao.service';

/**
 * Rastreio de lote no mapa de relacoes, um nivel por vez: a busca traz o lote, a OP que o gerou e os
 * lotes que ela consumiu. No card de lote, "Origem" (metade esquerda) traz a OP que o gerou e os insumos
 * dela, para tras; "Destino" (metade direita) traz as OPs que o consumiram, o que elas geraram e as vendas
 * com o cliente, para frente. O numero do lote vai escrito em cada ligacao.
 *
 * Declarado no AppModule e nao no ProducaoModule: o grafo do mapa de relacoes e declarado la.
 */
@Component({
  selector: 'app-rastreio-lote',
  templateUrl: './rastreio-lote.component.html',
})
export class RastreioLoteComponent implements OnInit {

  lote = ''
  carregando = false
  //clique num lote buscando o nivel seguinte - o mapa continua na tela
  abrindo : string = null
  //lote clicado: o mapa e refeito com ele parado no mesmo lugar e a origem aberta atras dele
  ancoraId : string = null
  resultado : MapaRelacoesResponse = null
  ordens : Array<MapaNode> = []
  //notas, entregas e devolucoes que o destino ja trouxe: quem comprou o lote
  vendas : Array<MapaNode> = []
  dataBr = dataBr

  constructor(
    private service : OrdemProducaoService,
    private alert : AlertService,
    private route : ActivatedRoute,
    private router : Router,
  ) {}

  // O lote fica na URL: da para mandar o link e o F5 refaz a busca (so o primeiro nivel).
  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.lote = params.get('lote') ?? ''
      if(this.lote)
        this.buscar()
      else
        this.mostrar(null)
    })
  }

  pesquisar() {
    const lote = this.lote.trim()
    if(!lote) {
      this.alert.info('Informe o número do lote')
      return
    }
    this.router.navigate([], { relativeTo: this.route, queryParams: { lote } })
  }

  private buscar() {
    this.ancoraId = null
    this.carregando = true
    this.mostrar(null)
    this.service.rastreioLote(this.lote.trim()).subscribe({
      next: resultado => {
        this.carregando = false
        this.mostrar(resultado)
      },
      error: e => {
        this.carregando = false
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  // So card de lote responde ao clique. O lado clicado escolhe origem ou destino; se so um dos dois
  // esta disponivel, qualquer ponto do card abre ele.
  abrir(evento : { no : MapaNode, lado : LadoRastreio }) {
    const no = evento.no
    if(no.tipo !== 'LOTE' || this.abrindo)
      return
    const disponivel = { origem : no.situacao === SITUACAO_ORIGEM_DISPONIVEL, destino : no.destino === true }
    const lado : LadoRastreio = disponivel[evento.lado] ? evento.lado : (disponivel.origem ? 'origem' : disponivel.destino ? 'destino' : null)
    if(!lado)
      return
    this.abrindo = `${lado === 'origem' ? 'a origem' : 'o destino'} do lote ${no.docNum}`
    const nivel$ = lado === 'origem' ? this.service.rastreioLote(no.docNum, no.item) : this.service.rastreioDestino(no.docNum, no.item)
    nivel$.subscribe({
      next: nivel => {
        this.abrindo = null
        this.ancoraId = no.id
        this.mostrar(mesclarNivel(this.resultado, nivel, no.id, lado))
        if(lado === 'destino' && nivel.aviso)
          this.alert.info(nivel.aviso)
      },
      error: e => {
        this.abrindo = null
        this.alert.error(this.mensagemErro(e))
      }
    })
  }

  private mostrar(resultado : MapaRelacoesResponse) {
    this.resultado = resultado
    this.ordens = (resultado?.nodes ?? [])
      .filter(it => it.tipo === 'ORDEM_PRODUCAO')
      .sort((a, b) => (b.docEntry ?? 0) - (a.docEntry ?? 0))
    this.vendas = (resultado?.nodes ?? [])
      .filter(it => ['NOTA_FISCAL', 'ENTREGA', 'DEVOLUCAO'].includes(it.tipo))
      .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
  }

  private mensagemErro(e : any) : string {
    return e?.error?.mensagem || e?.error?.message || 'Não foi possível rastrear o lote'
  }

  // Primeira linha extra do card: produto da OP ("PAC0000302 - OX ...").
  produto(ordem : MapaNode) : string {
    return ordem.detalhes?.[0] ?? ''
  }

  gerou(ordem : MapaNode) : string {
    return (ordem.detalhes ?? []).find(it => it.startsWith('Gerou: '))?.substring('Gerou: '.length) ?? ''
  }

  desmontagem(ordem : MapaNode) : boolean {
    return (ordem.detalhes ?? []).includes('Desmontagem')
  }
}
