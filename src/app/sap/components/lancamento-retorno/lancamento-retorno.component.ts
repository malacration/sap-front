import { Component, OnInit } from '@angular/core';
import { AlertService } from '../../../shared/service/alert.service';
import {
  RetornoAutomatico, LancamentoRetornoService, RetornoHistorico, PreviaLancamentoRetorno, RetornoDescontado
} from '../../service/lancamento-retorno.service';

interface Selecionado {
  retorno: RetornoDescontado
  carregando: boolean
  lancando: boolean
  previa?: PreviaLancamentoRetorno
  //erro da requisicao (rede, retorno inexistente); erro de regra vem em previa.erros
  erro?: string
  erroLancamento?: string
  //depois de falha HTTP no /lancar nao se sabe se o SAP gravou: so libera de novo com uma previa
  //nova bem-sucedida, nunca com a antiga
  previaDesatualizada?: boolean
  jdtNum?: number
  jaExistia?: boolean
  //so a previa pedida por ultimo vale (a lista recarregada pede outra)
  previaSeq?: number
}

/**
 * Lancamento de Retorno: LCM do desconto de duplicatas a partir dos retornos importados no BankPlus.
 *
 * O BankPlus deixa de fora do LCM dele os boletos que a API ja liquidou; aqui o LCM sai com todos
 * os boletos da ocorrencia de desconto, um por retorno. Cada retorno passa pela previa antes: o
 * botao de lancar so libera quando ela nao tem erro e o retorno ainda nao foi lancado.
 */
@Component({
  selector: 'app-lancamento-retorno',
  templateUrl: './lancamento-retorno.component.html',
  standalone: false,
})
export class LancamentoRetornoComponent implements OnInit {

  de = this.iso(-30)
  ate = this.iso(0)
  retornos: RetornoDescontado[] = []
  carregandoLista = false
  listou = false
  selecionado?: Selecionado
  automatico?: RetornoAutomatico
  //sem as tabelas LANC_RET_* no SAP o automatico e o historico ficam indisponiveis, a tela segue
  automaticoIndisponivel = false
  alterandoAutomatico = false
  historico: RetornoHistorico[] = []
  carregandoHistorico = false
  //so a resposta da consulta mais nova vale: uma antiga chegando depois voltaria o historico no tempo
  private historicoSeq = 0

  private moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  constructor(private service: LancamentoRetornoService, private alert: AlertService) {
  }

  ngOnInit() {
    this.listar()
    this.carregarAutomatico()
  }

  private carregarAutomatico() {
    this.service.automatico().subscribe({
      next: it => {
        this.automatico = it
        this.automaticoIndisponivel = false
        this.carregarHistorico()
      },
      //503 sem corpo = tabelas nao criadas; o resto o ErrorInterceptor ja mostra
      error: e => this.automaticoIndisponivel = e?.status === 503 && !e?.error
    })
  }

  carregarHistorico() {
    const seq = ++this.historicoSeq
    this.carregandoHistorico = true
    this.service.historico().subscribe({
      next: it => {
        if (seq !== this.historicoSeq) return
        this.historico = it
        this.carregandoHistorico = false
      },
      error: () => { if (seq === this.historicoSeq) this.carregandoHistorico = false }
    })
  }

  alternarAutomatico() {
    const ligar = this.automatico?.U_Ativo != 'Y'
    this.alert.confirm(ligar
      ? 'Ligar o lançamento automático? A partir de hoje, os retornos com desconto importados no BankPlus ' +
        'terão o LCM gerado sem conferência, a cada 30 minutos.'
      : 'Desligar o lançamento automático? Os próximos retornos ficam pendentes até alguém lançar pela tela.'
    ).then(res => {
      if (!res.isConfirmed) return
      this.alterandoAutomatico = true
      this.service.definirAutomatico(ligar).subscribe({
        next: it => {
          this.automatico = it
          this.alterandoAutomatico = false
          this.carregarHistorico()
        },
        error: () => this.alterandoAutomatico = false
      })
    })
  }

  listar() {
    if (!this.de || !this.ate) return
    this.carregandoLista = true
    this.service.retornos(this.de, this.ate).subscribe({
      next: it => {
        this.retornos = it
        this.carregandoLista = false
        this.listou = true
        //a previa aberta segue presa a linha nova do mesmo retorno, e e refeita: a linha pode ter
        //mudado (ex.: ja lancado). Sem a linha, so continua se estiver lancando.
        const sel = this.selecionado
        if (sel) {
          const mesmo = it.find(r => r.retorno === sel.retorno.retorno)
          if (mesmo) sel.retorno = mesmo
          if (!sel.lancando) {
            if (!mesmo) this.selecionado = undefined
            else { sel.previa = undefined; sel.carregando = true; this.previa(sel) }
          }
        }
      },
      //o ErrorInterceptor ja mostra o alerta; a lista antiga nao pode passar pelo periodo novo
      error: () => {
        this.carregandoLista = false
        this.retornos = []
        this.listou = false
        if (!this.selecionado?.lancando) this.selecionado = undefined
      }
    })
  }

  ver(retorno: RetornoDescontado) {
    //durante o lancamento o resultado precisa continuar visivel
    if (this.selecionado?.lancando) return
    this.selecionado = { retorno, carregando: true, lancando: false }
    this.previa(this.selecionado)
  }

  private previa(item: Selecionado) {
    const seq = item.previaSeq = (item.previaSeq ?? 0) + 1
    this.service.previa(item.retorno.retorno).subscribe({
      next: it => {
        if (seq !== item.previaSeq) return
        item.erro = undefined
        item.previa = it
        item.carregando = false
        item.previaDesatualizada = false
        //a resposta do /lancar falhou mas o SAP gravou: troca o "nao gerou" pelo que aconteceu
        if (item.erroLancamento && it.lcmExistente) {
          item.erroLancamento = `A resposta do lancamento falhou, mas o LCM ${it.lcmExistente} foi gravado no SAP.`
          item.retorno.lcm = it.lcmExistente
        }
      },
      error: e => {
        if (seq !== item.previaSeq) return
        item.carregando = false
        item.erro = e?.error?.mensagem || 'Nao foi possivel carregar o retorno'
      }
    })
  }

  podeLancar(item: Selecionado): boolean {
    return !!item.previa?.podeLancar && !item.jdtNum && !item.lancando && !item.carregando && !item.previaDesatualizada
  }

  lancar(item: Selecionado) {
    const p = item.previa
    this.alert.confirm(
      `Gerar o LCM de ${this.moeda.format(p.totalFace + p.totalIof + p.totalJuros)} ` +
      `(${p.titulos.length} boleto(s)) do retorno ${p.retorno}?`
    ).then(res => { if (res.isConfirmed) this.executaLancamento(item) })
  }

  private executaLancamento(item: Selecionado) {
    //trava antes da requisicao: duplo clique nao pode lancar o mesmo retorno duas vezes
    if (item.lancando) return
    item.lancando = true
    item.erroLancamento = undefined
    this.service.lancar(item.retorno.retorno).subscribe({
      next: it => {
        item.lancando = false
        //sem jdtNum o backend recusou pela regra: a previa que volta traz os motivos atualizados
        if (!it.jdtNum) {
          item.previa = it.previa
          item.erroLancamento = 'O LCM nao foi gerado. Veja os erros abaixo.'
          return
        }
        item.jdtNum = it.jdtNum
        item.jaExistia = it.jaExistia
        item.retorno.lcm = it.jdtNum
        this.carregarHistorico()
        this.alert.info(it.jaExistia
          ? `Esse retorno ja estava lancado: LCM ${it.jdtNum}`
          : `LCM ${it.jdtNum} gerado`)
      },
      //falha de rede pode ter acontecido depois de o SAP gravar: refaz a previa antes de deixar
      //tentar de novo, e ela mostra "ja lancado" se foi o caso
      error: e => {
        item.lancando = false
        item.erroLancamento = e?.error?.mensagem || 'Nao foi possivel gerar o LCM'
        item.previaDesatualizada = true
        item.carregando = true
        this.previa(item)
      }
    })
  }

  //"2026-09-16" direto para "16/09/2026": o DatePipe leria a data como meia-noite UTC e, no fuso
  //daqui, mostraria o dia anterior
  data(iso: string | null): string {
    return typeof iso === 'string' ? iso.substring(0, 10).split('-').reverse().join('/') : ''
  }

  //"2026-11-05T09:30:00" para "05/11/2026 09:30"
  dataHora(iso?: string): string {
    return iso ? `${this.data(iso)} ${iso.substring(11, 16)}` : ''
  }

  //hoje + dias, no fuso local, em "yyyy-MM-dd" para o input date
  private iso(dias: number): string {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}
