import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { AlertService } from '../../../../shared/service/alert.service';
import { Branch } from '../../../../sap/model/branch';
import { BranchService } from '../../../../sap/service/branch.service';
import { TicketFreteLocalidade } from '../../../../sap/model/ticket-frete.model';
import { TicketFreteService } from '../../service/ticket-frete.service';

@Component({
    selector: 'app-ticket-frete',
    templateUrl: './ticket-frete.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TicketFreteComponent implements OnInit {

  //periodo no formato yyyy-MM-dd (o que o input type=date usa e o que o back espera)
  de : string = ''
  ate : string = ''
  filial : number = null

  //qual leitura do mesmo frete a tela mostra: por nota emitida ou por produto
  //vendido (frete total / quantidade). O backend devolve as duas em toda linha
  metrica : 'nota' | 'produto' = 'nota'

  filiais : Array<Branch> = []
  linhas : Array<TicketFreteLocalidade> = []
  loading = false
  buscou = false

  constructor(private service : TicketFreteService,
              private branchService : BranchService,
              private alert : AlertService){
  }

  ngOnInit(): void {
    const hoje = new Date()
    this.ate = this.formataData(hoje)
    this.de = this.formataData(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
    this.branchService.get().subscribe(it => this.filiais = it || [])
    this.buscar()
  }

  buscar(){
    if(!this.de || !this.ate){
      this.alert.info('Informe o período do relatório.')
      return
    }
    if(this.ate < this.de){
      this.alert.info('A data final não pode ser menor que a inicial.')
      return
    }
    this.loading = true
    this.service.getTicketMedioPorLocalidade(this.de, this.ate, this.filial).subscribe({
      next : (it) => {
        this.linhas = it || []
        this.buscou = true
        this.loading = false
      },
      error : (e) => {
        this.loading = false
        this.alert.error(e?.error?.message || e?.message || 'Não foi possível gerar o relatório')
      }
    })
  }

  trocarMetrica(metrica : 'nota' | 'produto'){
    this.metrica = metrica
  }

  get rotuloMetrica() : string {
    return this.metrica == 'nota' ? 'Ticket Médio (por nota)' : 'Ticket Médio (por produto)'
  }

  ticketDaLinha(linha : TicketFreteLocalidade) : number {
    return Number((this.metrica == 'nota' ? linha.TicketMedio : linha.TicketMedioProduto) || 0)
  }

  //ordenado pela metrica escolhida, do frete mais caro pro mais barato
  get linhasOrdenadas() : Array<TicketFreteLocalidade> {
    return [...this.linhas].sort((a, b) => this.ticketDaLinha(b) - this.ticketDaLinha(a))
  }

  selecionaFilial($event){
    this.filial = $event ? this.bplid($event) : null
  }

  //o Branch vindo do app-select as vezes traz Bplid/BPLID dependendo da origem, cobrimos os dois
  bplid(branch : any) : number {
    const valor = branch?.BPLID ?? branch?.Bplid
    return valor != null ? Number(valor) : null
  }

  nomeFilial(bplid : number) : string {
    if(!bplid)
      return 'Todas as filiais'
    const filial : any = this.filiais.find(it => this.bplid(it) == bplid)
    return filial ? (filial.BPLName ?? filial.Bplname) : String(bplid)
  }

  get totalNotas() : number {
    return this.linhas.reduce((soma, it) => soma + (it.Notas || 0), 0)
  }

  get totalFrete() : number {
    return this.linhas.reduce((soma, it) => soma + Number(it.TotalFrete || 0), 0)
  }

  get totalQuantidade() : number {
    return this.linhas.reduce((soma, it) => soma + Number(it.Quantidade || 0), 0)
  }

  //cada nota pertence a uma unica localidade (a do endereco de entrega dela),
  //entao o ticket geral e o frete total dividido pelo total de notas - nao a
  //media das medias, que daria peso igual a localidades de volumes diferentes
  get ticketMedioGeral() : number {
    if(this.metrica == 'produto')
      return this.totalQuantidade > 0 ? this.totalFrete / this.totalQuantidade : 0
    return this.totalNotas > 0 ? this.totalFrete / this.totalNotas : 0
  }

  gerarPdf(){
    if(this.linhas.length == 0){
      this.alert.info('Nenhum dado para gerar o PDF.')
      return
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const marginX = 10
    const tableStartY = 30

    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text('Ticket Médio de Frete por Localidade', pageW / 2, 12, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Período: ${this.formataDataBr(this.de)} a ${this.formataDataBr(this.ate)} - ${this.nomeFilial(this.filial)}`,
      pageW / 2, 18, { align: 'center' })
    doc.text(this.metrica == 'nota'
      ? 'Notas fiscais com frete cobrado, agrupadas pela localidade do endereço de entrega - ticket médio por nota'
      : 'Notas fiscais com frete cobrado, agrupadas pela localidade do endereço de entrega - ticket médio por produto vendido',
      pageW / 2, 23, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      pageW - marginX, 12, { align: 'right' })

    const body : RowInput[] = this.linhasOrdenadas.map(linha => [
      { content: linha.Localidade || linha.CodLocalidade, styles: { halign: 'left' as 'left' } },
      { content: String(linha.Notas), styles: { halign: 'center' as 'center' } },
      { content: this.formatNumero(Number(linha.Quantidade)), styles: { halign: 'center' as 'center' } },
      { content: `R$ ${this.formatCurrency(Number(linha.TotalFrete))}`, styles: { halign: 'right' as 'right' } },
      { content: `R$ ${this.formatCurrency(this.ticketDaLinha(linha))}`, styles: { halign: 'right' as 'right' } },
    ])

    body.push([
      { content: 'Total', styles: { halign: 'left' as 'left', fontStyle: 'bold' as 'bold' } },
      { content: String(this.totalNotas), styles: { halign: 'center' as 'center', fontStyle: 'bold' as 'bold' } },
      { content: this.formatNumero(this.totalQuantidade), styles: { halign: 'center' as 'center', fontStyle: 'bold' as 'bold' } },
      { content: `R$ ${this.formatCurrency(this.totalFrete)}`, styles: { halign: 'right' as 'right', fontStyle: 'bold' as 'bold' } },
      { content: `R$ ${this.formatCurrency(this.ticketMedioGeral)}`, styles: { halign: 'right' as 'right', fontStyle: 'bold' as 'bold' } },
    ])

    autoTable(doc, {
      head: [[
        { content: 'Localidade', styles: { halign: 'left' as 'left' } },
        { content: 'Notas', styles: { halign: 'center' as 'center' } },
        { content: 'Produtos', styles: { halign: 'center' as 'center' } },
        { content: 'Frete Total', styles: { halign: 'right' as 'right' } },
        { content: this.rotuloMetrica, styles: { halign: 'right' as 'right' } },
      ]],
      body,
      startY: tableStartY,
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [0, 0, 0],
        lineColor: [157, 157, 157],
        lineWidth: 0.1,
        cellPadding: 1.5,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [215, 215, 215],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [157, 157, 157]
      },
      alternateRowStyles: { fillColor: [238, 238, 238] },
      margin: { top: tableStartY, left: marginX, right: marginX, bottom: 10 },
      showHead: 'everyPage'
    })

    //abre em nova aba; se o navegador bloquear o popup, cai pro download
    const blobUrl = doc.output('bloburl').toString()
    const novaAba = window.open(blobUrl, '_blank')
    if(!novaAba)
      doc.save(`Ticket_Medio_Frete_${this.de}_${this.ate}.pdf`)
  }

  private formataData(data : Date) : string {
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${data.getFullYear()}-${mes}-${dia}`
  }

  private formataDataBr(data : string) : string {
    if(!data)
      return '-'
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  formatNumero(value : number) : string {
    return (value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  }

  private formatCurrency(value : number) : string {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
}
