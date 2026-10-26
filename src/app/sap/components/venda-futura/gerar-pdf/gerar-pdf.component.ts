import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { VendaFutura } from '../../../model/venda/venda-futura';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { NegociacaoContrato, VendaFuturaService } from '../../../service/venda-futura.service';
import { PdfService } from '../../../service/pdf.service';
import { AlertService } from '../../../../shared/service/alert.service';
import { BusinessPartnerService } from '../../../../modulos/sap-shared/_services/business-partners.service';

@Component({
  selector: 'app-gerar-pdf',
  templateUrl: './gerar-pdf.component.html',
  styleUrls: ['./gerar-pdf.component.scss']
})
export class GerarPdfComponent implements OnChanges {

  @Input() vendaFutura: VendaFutura;
  @Input() businessPartner: BusinessPartner;
  @ViewChild('pdfContent', { static: false }) pdfContent: ElementRef;

  /** Forma e parcelamento vem do pedido de origem (o contrato nao guarda a forma). */
  negociacao: NegociacaoContrato = null
  carregandoNegociacao = false
  erroNegociacao = false
  /** resposta de um contrato anterior que chegar atrasada nao pode entrar na minuta do atual */
  private consulta = 0

  constructor(private vendaFuturaService: VendaFuturaService, private pdfService: PdfService,
              private alert: AlertService, private bpService: BusinessPartnerService) {
  }

  /** Cliente do contrato, para endereco de entrega e CPF/CNPJ da minuta (a tela nao passa o businessPartner). */
  private consultaCliente = 0

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vendaFutura']) {
      this.carregaNegociacao()
      this.carregaCliente()
    }
  }

  carregandoCliente = false

  private carregaCliente(): void {
    const consulta = ++this.consultaCliente
    //o cliente do contrato anterior nao pode ficar na minuta enquanto (ou se nao) chega o novo
    this.businessPartner = null
    this.carregandoCliente = false
    const cardCode = this.vendaFutura?.U_cardCode
    if (!cardCode)
      return
    this.carregandoCliente = true
    this.bpService.get(cardCode).subscribe({
      next: cliente => {
        if (consulta != this.consultaCliente) return
        this.businessPartner = cliente
        this.carregandoCliente = false
      },
      //sem o cadastro a minuta sai com as linhas em branco para preencher a mao
      error: () => {
        if (consulta == this.consultaCliente) this.carregandoCliente = false
      }
    })
  }

  /** Enquanto busca negociacao ou cliente, a minuta ainda nao esta pronta para baixar. */
  get carregandoDados(): boolean {
    return this.carregandoNegociacao || this.carregandoCliente
  }

  static readonly BRANCO = '______________________'
  static readonly AVISO_SEM_NEGOCIACAO = 'Não foi possível carregar a forma de pagamento e o parcelamento. '
    + 'Esses campos vão sair em branco na minuta, para preencher à mão. Baixar mesmo assim?'

  /** Documento do cliente: TaxId0 (CNPJ) ou TaxId4 (CPF), no topo ou na colecao fiscal do SAP. */
  get documentoCliente(): string {
    const cliente: any = this.businessPartner
    if (!cliente) return ''
    const direto = cliente.TaxId0 || cliente.TaxId4
    if (direto) return String(direto)
    const fiscal = (cliente.BPFiscalTaxIDCollection || []).find(it => it?.TaxId0 || it?.TaxId4)
    return fiscal ? String(fiscal.TaxId0 || fiscal.TaxId4) : ''
  }

  /**
   * Endereco de entrega do cliente. Com mais de um, fica o da localidade do contrato (U_Localidade),
   * que e a usada no frete; senao o primeiro de entrega.
   */
  get enderecoEntrega(): any {
    const enderecos: Array<any> = (this.businessPartner as any)?.BPAddresses || []
    const entregas = enderecos.filter(it => it?.AddressType == 'bo_ShipTo')
    const localidade = this.vendaFutura?.U_Localidade
    return entregas.find(it => localidade != null && it.U_Localidade == localidade) || entregas[0] || null
  }

  get logradouroEntrega(): string {
    const endereco = this.enderecoEntrega
    if (!endereco) return ''
    return [endereco.TypeOfAddress, endereco.Street].filter(it => it && it != 'none').join(' ').trim()
  }

  get cidadeEntrega(): string {
    const endereco = this.enderecoEntrega
    if (!endereco?.City) return ''
    return endereco.State ? `${endereco.City}/${endereco.State}` : endereco.City
  }

  private carregaNegociacao(): void {
    const consulta = ++this.consulta
    this.negociacao = null
    this.erroNegociacao = false
    const docEntry = this.vendaFutura?.DocEntry
    if (docEntry == null) {
      this.carregandoNegociacao = false
      return
    }
    this.carregandoNegociacao = true
    this.vendaFuturaService.negociacao(docEntry).subscribe({
      next: negociacao => {
        if (consulta != this.consulta) return
        this.negociacao = negociacao
        this.carregandoNegociacao = false
      },
      error: () => {
        if (consulta != this.consulta) return
        this.erroNegociacao = true
        this.carregandoNegociacao = false
      }
    })
  }

  //falha na busca sai como linha em branco, para nao parecer que o pedido nao tem o dado
  get formaPagamentoTexto(): string {
    if (this.carregandoNegociacao) return 'carregando...'
    if (this.erroNegociacao) return GerarPdfComponent.BRANCO
    return this.negociacao?.formaPagamento || 'Não informada'
  }

  get parcelamentoTexto(): string {
    if (this.carregandoNegociacao) return 'carregando...'
    if (this.erroNegociacao) return GerarPdfComponent.BRANCO
    const quantidade = this.negociacao?.quantidadeParcelas
    if (!quantidade) return 'Não informado'
    const parcelas = quantidade == 1 ? '1 parcela' : `${quantidade} parcelas`
    const condicao = this.negociacao?.condicaoPagamento
    return condicao ? `${parcelas} (${condicao})` : parcelas
  }

  gerandoPdf = false

  get nomeArquivo(): string {
    const numero = this.vendaFutura?.DocEntry ?? ''
    const cliente = this.vendaFutura?.U_cardName ?? ''
    return PdfService.nomeArquivo(`Minuta de contrato ${numero} - ${cliente}`) + '.pdf'
  }

  /** Baixa a minuta como PDF (antes abria o HTML numa aba para imprimir). */
  async baixarPdf(): Promise<void> {
    if (this.gerandoPdf)
      return
    if (!this.pdfContent?.nativeElement) {
      this.alert.error('A minuta ainda não foi montada na tela. Abra o preview e tente de novo.')
      return;
    }
    if (this.carregandoDados) {
      this.alert.error('Aguarde carregar os dados do contrato antes de baixar a minuta.')
      return;
    }
    if (this.erroNegociacao) {
      const contratoConfirmado = this.vendaFutura?.DocEntry
      const resposta = await this.alert.confirm(GerarPdfComponent.AVISO_SEM_NEGOCIACAO)
      if (!resposta?.isConfirmed)
        return;
      //enquanto o alerta estava aberto o contrato pode ter trocado: a confirmacao vale so para aquele
      if (this.vendaFutura?.DocEntry != contratoConfirmado || this.carregandoDados || this.gerandoPdf)
        return;
    }
    this.gerandoPdf = true
    try {
      //minuta para assinar: sempre numa pagina so
      await this.pdfService.baixarPdfPaginado(this.pdfContent.nativeElement, this.nomeArquivo, true)
    } catch (e) {
      //sem isso a falha so ia para o console e o botao "nao fazia nada"
      console.error('Falha ao gerar o PDF da minuta', e)
      this.alert.error('Não foi possível gerar o PDF: ' + (e?.message || e))
    } finally {
      this.gerandoPdf = false
    }
  }
}
