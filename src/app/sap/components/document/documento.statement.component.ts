import { Component, OnInit, ViewChild } from '@angular/core';
import { BusinessPartnerService } from '../../../modulos/sap-shared/_services/business-partners.service';
import { Option } from '../../model/form/option';
import { RadioItem } from '../form/radio/radio.model';
import { Item } from '../../model/item';
import { AlertService } from '../../../shared/service/alert.service';
import { Router } from '@angular/router';
import { Observable, Subject, forkJoin, of} from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { BPAddress, BusinessPartner } from '../../model/business-partner/business-partner';
import * as moment from 'moment';
import { OrderSalesService } from '../../../modulos/sap-shared/_services/documents/order-sales.service';
import { DocumentAngularSave } from '../../service/document/document-angular-save';
import { QuotationService } from '../../service/document/quotation.service';
import { Branch } from '../../model/branch';
import { BranchSelectComponent } from '../../../modulos/sap-shared/componentes/branch/branch-select.component';
import { PedidoVenda } from '../../model/document/pedido-venda.model';
import { LocalidadeService } from '../../../modulos/sap-shared/_services/localidade.service';
import { RegiaoService } from '../../../modulos/sap-shared/_services/regiao.service';
import { Regiao } from '../../model/regiao/regiao';
import { ActivatedRoute } from '@angular/router';
import { OfflineContextService } from '../../../core/offline/offline-context.service';
import { OfflineQueueService } from '../../../core/offline/offline-queue.service';
import { OfflineCatalogRepository } from '../../../core/offline/offline-catalog.repository';
import { AuthService } from '../../../shared/service/auth.service';

@Component({
  selector: 'app-document-statement',
  templateUrl: './document.statement.component.html',
  styleUrls: ['./document.statement.component.scss'],
})
export class DocumentStatementComponent implements OnInit {

  branchId = undefined
  tipoEnvio
  businesPartner : BusinessPartner = null;
  formaPagamento
  observacao
  itens : Array<Item>
  tipoOperacao
  dtEntrega
  loading = false
  frete : number = 0
  //false enquanto o valor na tela nao corresponde ao estado atual do pedido: durante o recalculo
  //e em qualquer caminho que invalide o frete. Sem isso o campo seguia mostrando o valor anterior
  //como se fosse o vigente - e se a chamada falhasse ou nunca voltasse, um numero irreal ficava
  //travado na tela e entrava no total.
  freteCalculado = false
  selectedBranch: Branch = null;
  offlineEditId: string = null
  selectedPaymentTerms : {[priceList: string]: any} = {}

  //frete calculado automaticamente a partir da localidade do endereco de
  //entrega escolhido (ver recalcularFrete) - freteErro bloqueia o envio do
  //pedido (isFormValid)
  calculandoFrete = false
  //recarregando o cadastro do cliente antes de refazer o calculo (ver recarregarFrete)
  recarregandoFrete = false
  //true da hora que a pessoa clica em "Recalcular frete" ate o calculo terminar. Segura o
  //bloco de erro/retry na tela durante a retentativa: o recalculo limpa o freteErro no inicio,
  //e sem isso o botao sumiria no meio da propria acao do usuario.
  retentandoFrete = false
  freteErro : string = null
  //frete.manual no back (ver AuthService.isFreteManual): o vendedor digita o valor e nao ha
  //calculo por regiao nem exigencia de localidade no endereco de entrega
  readonly freteManual : boolean
  //Regiao e localidade resolvidas no ultimo calculo de frete. Guardadas porque o frete de cada
  //documento gerado precisa ser recalculado com a quantidade daquele grupo - a faixa de preco
  //depende da quantidade, entao ratear o valor combinado gera um numero que o backend nao
  //reproduz ao revalidar o documento sozinho.
  private regiaoFrete : Regiao = null
  private localidadeFrete : string = null

  //nome da localidade vinculada ao endereco de entrega, exibido na tela: so o codigo (ou nada)
  //obriga a pessoa a ir garimpar no cadastro do cliente pra saber qual vinculo esta valendo
  localidadeEntrega : string = null
  private localidadeCarregada : string = null
  enderecoEntrega : BPAddress = null
  //cada recalculo ganha um numero de sequencia: resposta que chega depois de
  //um novo recalculo (ou depois de o usuario voltar pra retirada) e descartada
  private freteSeq = 0
  private recalculoFrete = new Subject<{seq : number, codLocalidade : string, filial : number, quantidade : number}>()

  @ViewChild('branch', {static: true}) vcBranch: BranchSelectComponent;

  tipoEnvioRadio : Array<RadioItem> = [new RadioItem("Retirada","ret"), new RadioItem("Entrega","ent")]
  tipoOperacaoOptions: Array<Option> = [new Option(9,"venda"), new Option(16,"venda com entrega futura")]

  constructor(private businesPartnerService : BusinessPartnerService,
    private quotationService : QuotationService,
    private orderService : OrderSalesService,
    private regiaoService : RegiaoService,
    private localidadeService : LocalidadeService,
    private config : ConfigService,
    private router : Router,
    private alertService : AlertService,
    private route: ActivatedRoute,
    public offline: OfflineContextService,
    private offlineQueue: OfflineQueueService,
    private offlineCatalog: OfflineCatalogRepository,
    auth: AuthService){
    this.freteManual = auth.isFreteManual()
  }

  ngOnInit(): void {
    //debounce porque digitar a quantidade dispara um recalculo por tecla, e
    //switchMap pra cancelar a requisicao anterior que ainda estiver em voo
    this.recalculoFrete.pipe(
      debounceTime(400),
      switchMap(params => this.regiaoService.getByLocalidade(params.codLocalidade).pipe(
        map(regioes => ({params, regioes})),
        catchError(() => of({params, regioes : null}))
      ))
    ).subscribe(({params, regioes}) => {
      if(params.seq != this.freteSeq)
        return
      this.calculandoFrete = false
      this.retentandoFrete = false
      if(regioes == null){
        this.defineFrete(0)
        this.freteErro = 'Não foi possível calcular o frete para o cliente selecionado.'
        return
      }
      const regiao = regioes.find(it => it.ativa && it.U_Filial == params.filial)
      const resultado = regiao?.calcularFrete(params.codLocalidade, params.quantidade)
      if(!resultado){
        this.regiaoFrete = null
        this.defineFrete(0)
        this.freteErro = 'Não foi possível calcular o frete para a localidade do cliente (nenhuma região de frete ativa cobre essa localidade para a filial selecionada).'
        return
      }
      //guardados para calcular o frete de cada documento gerado (ver freteDoGrupo)
      this.regiaoFrete = regiao
      this.localidadeFrete = params.codLocalidade
      this.defineFrete(this.somaDoFretePorGrupo())
    })

    const editId = this.route.snapshot.queryParamMap.get('offlineEdit')
    if(editId)
      this.loadOfflineQuotation(editId)
  }

  get offlineMode() : boolean {
    return this.offline.shouldUseOfflineData
  }

  changeOperacao(){
    if(this.config.tipoOperacao.length > 0 && this.branchId)
      this.tipoOperacaoOptions = this.config.tipoOperacao.filter(it => it.filiais.includes(this.branchId) ).map(it => new Option(it.id,it.label))
  }

  changePageBusinesPartner(){
    
  }
  
  changeFormaPagamento($event){
    this.formaPagamento = $event
  }

  changeCondicaoPagamento($event){
    this.selectedPaymentTerms[String($event.ListNum)] = $event
    if($event.GroupNum)
      this.itens.filter(it => it.PriceList == $event.ListNum)
      .forEach(it => {
        it.GroupNum = $event.GroupNum
        it.descontoCondicaoPagamento = $event.U_desconto
        it.jurosCondicaoPagamento = $event.U_juros
      })
  }

  changeItens($event){
    this.itens = $event
    this.recalcularFrete()
  }

  changeTipoOperacao($event){
    this.tipoOperacao = $event
  }

  tabelas() : Array<string>{
    return Object.keys(this.itens.reduce((result:any, currentValue:any) => { 
      (result[currentValue['PriceList']] = result[currentValue['PriceList']] || []).push(currentValue);
      return result;
    }, {}));
  }

  getTabela() : string{
    let tabelas = this.tabelas()
    if(tabelas && tabelas.length > 0)
      return tabelas[0]
  }

  itensBy(priceList){
    return this.itens.filter(it => it.PriceList == priceList)
  }

  isMutiplasTabelas(){
    if(this.itens){
      return this.tabelas().length > 1
    }
    return false
  }

  selectBranch(branch: Branch){
    this.branchId = branch.Bplid;
    this.selectedBranch = branch;
    this.changeOperacao();
    this.recalcularFrete()
  }

  selectBp($event){
    this.businesPartner = $event
    this.enderecoEntrega = null
    if(!this.businesPartner){
      this.recalcularFrete()
      return
    }
    this.businesPartnerService.get(this.businesPartner.CardCode).subscribe(it =>{
        this.businesPartner = it
        //mesmo default do back (DocumentForAngular.enderecoEntregaSelecionado):
        //sem escolha explicita vale o primeiro endereco de entrega do cliente.
        //O valor vem da mesma lista de options usada no template (ela e
        //cacheada no BusinessPartner), entao o select ja aparece com ele
        //marcado via initialSelect
        //Option.value e tipado como string, mas getAddressOptions guarda o
        //proprio BPAddress ali (o select emite esse mesmo objeto de volta)
        this.enderecoEntrega = (this.businesPartner.getAddressOptions('bo_ShipTo')[0]?.value as unknown as BPAddress) ?? null
        this.recalcularFrete()
    })
  }

  selectEnderecoEntrega(endereco : BPAddress){
    this.enderecoEntrega = endereco
    this.recalcularFrete()
  }

  /**
   * Refaz o calculo do frete buscando o cadastro do cliente de novo.
   *
   * O erro de frete quase sempre e cadastro faltando no SAP (localidade nao preenchida no
   * endereco, regiao sem a localidade vinculada). A pessoa corrige la, mas a tela ja tem o
   * pedido inteiro digitado e o cliente em memoria e o de antes da correcao - sem esse botao a
   * unica saida era recarregar a pagina e perder o pedido.
   *
   * So mexe no cliente/endereco/frete. Itens, pagamento, observacao e o resto do formulario
   * ficam intactos de proposito.
   */
  recarregarFrete(){
    if(!this.businesPartner){
      this.recalcularFrete()
      return
    }
    const enderecoAtual = this.enderecoEntrega?.AddressName
    this.retentandoFrete = true
    this.recarregandoFrete = true
    this.freteErro = null
    this.businesPartnerService.get(this.businesPartner.CardCode).subscribe({
      next : it => {
        this.businesPartner = it
        this.enderecoEntrega = this.reselecionaEnderecoEntrega(enderecoAtual)
        //o nome pode ter mudado junto com o cadastro que a pessoa acabou de corrigir
        this.localidadeCarregada = null
        this.recarregandoFrete = false
        this.recalcularFrete()
      },
      error : () => {
        this.recarregandoFrete = false
        this.retentandoFrete = false
        this.freteErro = 'Nao foi possivel recarregar o cadastro do cliente. Tente novamente.'
      }
    })
  }

  /**
   * Depois de recarregar o cliente os BPAddress sao objetos novos, entao a escolha do usuario
   * so sobrevive se for reencontrada pelo nome - comparar por referencia perderia o endereco
   * selecionado e jogaria a tela pro primeiro da lista.
   */
  private reselecionaEnderecoEntrega(addressName : string) : BPAddress {
    const enderecos = this.businesPartner.getAddressOptions('bo_ShipTo')
    const escolhido = enderecos.find(op => (op.value as unknown as BPAddress)?.AddressName == addressName)
    return ((escolhido ?? enderecos[0])?.value as unknown as BPAddress) ?? null
  }

  /** Unico ponto que da um valor definitivo ao frete - so aqui o campo volta a ser confiavel. */
  private defineFrete(valor : number){
    this.frete = valor
    this.freteCalculado = true
  }

  private limpaLocalidade(){
    this.localidadeEntrega = null
    this.localidadeCarregada = null
  }

  /**
   * Busca o nome da localidade uma vez por codigo - o recalculo dispara a cada tecla na
   * quantidade, e sem essa guarda seria uma requisicao por tecla. Enquanto o nome nao chega (ou
   * se a busca falhar) fica so o codigo na tela, que ja e melhor que nada.
   */
  private carregaLocalidade(codLocalidade : string){
    if(this.localidadeCarregada == codLocalidade)
      return
    this.localidadeCarregada = codLocalidade
    this.localidadeEntrega = codLocalidade
    this.localidadeService.get(codLocalidade).subscribe({
      next : it => {
        if(this.localidadeCarregada != codLocalidade)
          return
        this.localidadeEntrega = it?.Name ? codLocalidade+' - '+it.Name : codLocalidade
      },
      error : () => {
        if(this.localidadeCarregada != codLocalidade)
          return
        this.localidadeEntrega = codLocalidade
      }
    })
  }

  /**
   * Frete automatico: usa a localidade do endereco de entrega escolhido no
   * select (bo_ShipTo) pra achar a regiao ativa da filial selecionada e
   * calcular o valor (Regiao.calcularFrete, mesma formula do simulador de
   * Frete). Precisa ser chamado sempre que mudar filial, cliente, endereco,
   * tipo de envio ou a quantidade dos itens. Sem localidade cadastrada ou sem
   * regiao cobrindo ela, freteErro fica setado e bloqueia o envio (ver
   * isFormValid/sendOrder) - o back tambem valida isso de novo antes de
   * gravar, entao nao da pra contornar so pelo front.
   */
  private recalcularFrete(){
    //invalida qualquer resposta de recalculo anterior que ainda esteja em voo
    this.freteSeq++
    this.freteErro = null
    //o valor na tela deixa de valer aqui, nao quando a resposta chega
    this.freteCalculado = false
    if(this.tipoEnvio != 'ent'){
      this.defineFrete(0)
      this.calculandoFrete = false
      this.retentandoFrete = false
      this.limpaLocalidade()
      return
    }
    if(this.freteManual){
      //valor digitado pelo vendedor continua valendo - nada a recalcular
      this.freteCalculado = true
      this.calculandoFrete = false
      this.retentandoFrete = false
      return
    }
    if(!this.businesPartner || !this.itens || this.itens.length == 0){
      this.defineFrete(0)
      this.calculandoFrete = false
      this.retentandoFrete = false
      return
    }
    if(!this.enderecoEntrega){
      this.defineFrete(0)
      this.calculandoFrete = false
      this.retentandoFrete = false
      this.freteErro = 'O cliente selecionado não possui endereço de entrega cadastrado.'
      this.limpaLocalidade()
      return
    }
    const codLocalidade = this.enderecoEntrega.U_Localidade
    if(!codLocalidade){
      this.defineFrete(0)
      this.calculandoFrete = false
      this.retentandoFrete = false
      this.freteErro = 'O endereço de entrega selecionado não possui localidade cadastrada. Cadastre a localidade antes de finalizar a venda.'
      this.limpaLocalidade()
      return
    }
    this.carregaLocalidade(String(codLocalidade))
    if(!this.branchId){
      this.defineFrete(0)
      this.calculandoFrete = false
      this.retentandoFrete = false
      return
    }
    const quantidade = this.itens.reduce((acc,it) => acc+(Number(it.quantidade) || 0),0)
    this.calculandoFrete = true
    this.recalculoFrete.next({
      seq : this.freteSeq,
      codLocalidade : String(codLocalidade),
      filial : this.branchId,
      quantidade
    })
  }

  setVehicleState() { 
    if (this.tipoEnvio == 'ret') {
      this.dtEntrega = moment().format('YYYY-MM-DD');
      return this.selectedBranch?.prefState || '';
    } else {
      this.dtEntrega = null;
      return null;
    }
  }
  
  tipoEnvioChange($event){
    if($event instanceof RadioItem)
      this.tipoEnvio = $event.content

    this.setVehicleState();
    this.recalcularFrete()
  }

  temFormaPagamento(){
    return this.itens
  }

  total() : number{
    //frete so entra no total depois de confirmado: somar o valor antigo durante o recalculo
    //mostraria um total que nao corresponde a nenhum estado real do pedido
    return this.itens.reduce((acc,it) => acc+it.unitPriceLiquid()*it.quantidade,0)
      + (this.freteCalculado ? this.frete : 0)
  }

  sendOrder(){
    if(this.freteErro){
      this.alertService.error(this.freteErro)
      return
    }
    this.loading = true
    let subiscribers = Array<Observable<any>>();

    let service : DocumentAngularSave = this.quotationService
    let redirectRoute = 'venda/cotacao'

    const tipoOperacaoSelecionado = this.config.tipoOperacao.filter(it => it.id == this.tipoOperacao)[0]
    if(tipoOperacaoSelecionado?.document == 'ordersales' && this.tipoEnvio == 'ret') {
      service = this.orderService
      redirectRoute = 'venda/pedidos-venda'
    }

    const documents = this.buildDocuments()
    if(this.offlineMode){
      this.saveOffline(documents)
      return
    }
    documents.forEach(order => subiscribers.push(service.save(order)))
    forkJoin(subiscribers).subscribe({
      next:results => {
        //quando uma regra de autorizacao pega o documento (ex.: cliente com
        //pagamento em atraso), o back devolve 202 + {pendente:true, motivo} em vez
        //do documento criado - ver AutorizacaoPendenteDto/RegraAutorizacaoService
        const pendentes = (results || []).filter((r : any) => r?.pendente)
        if(pendentes.length > 0)
          this.concluirEnvioPendente(pendentes, redirectRoute)
        else
          this.concluirEnvio(redirectRoute);
      },
      error : result => {
        this.loading = false
      },
    });
  }

  private buildDocuments() : Array<PedidoVenda> {
    const documents = new Array<PedidoVenda>()
    const grupos = this.agruparPorGroupNum()
    const fretesManuais = this.freteManual ? this.rateiaFreteManual(Array.from(grupos.values())) : null
    let indice = 0
    grupos.forEach((itens,groupNum) => {
      const order = new PedidoVenda()
      order.CardCode = this.businesPartner.CardCode
      order.BPL_IDAssignedToInvoice = this.branchId
      order.DocumentLines = itens.map(it => it.getDocumentsLines(this.tipoOperacao))
      order.PaymentMethod = this.formaPagamento
      order.PaymentGroupCode = groupNum
      order.Comments = this.observacao
      order.DocDueDate = this.dtEntrega
      order.shipToCode = this.tipoEnvio == 'ent' ? this.enderecoEntrega?.AddressName : null
      //frete da quantidade DESTE grupo, nao um rateio do combinado - e o unico valor que o
      //backend consegue reproduzir ao revalidar o documento sozinho
      order.Frete = fretesManuais ? fretesManuais[indice++] : this.freteDoGrupo(itens)
      order.TaxExtension = {
        VehicleState: this.setVehicleState(),
        Incoterms: this.tipoEnvio == 'ret' ? 9 : 0
      }
      documents.push(order)
    })
    return documents
  }

  /**
   * Frete de UM documento, calculado com a quantidade daquele grupo.
   *
   * Nao pode ser rateio do frete combinado. O `Regiao.encontraFaixa` escolhe a tarifa por faixa
   * de quantidade: 60 + 40 itens somam 100 e podem alcancar uma faixa mais barata que nenhum dos
   * dois grupos atinge sozinho. Cada documento e postado separadamente, com apenas as linhas do
   * seu grupo, e o backend revalida usando a quantidade DAQUELE documento - um valor rateado da
   * faixa combinada e irreproduzivel ali, e o documento seria recusado ou cobrado errado.
   */
  private freteDoGrupo(itens : Item[]) : number {
    if(!this.regiaoFrete || !this.localidadeFrete)
      return 0
    const quantidade = itens.reduce((acc,it) => acc + (Number(it.quantidade) || 0), 0)
    return this.regiaoFrete.calcularFrete(this.localidadeFrete, quantidade)?.total ?? 0
  }

  /**
   * Frete total do pedido: a soma do que cada documento vai cobrar de verdade.
   *
   * Nao e o frete da quantidade combinada. Quando o pedido se quebra por condicao de pagamento,
   * cada documento cai na faixa da sua propria quantidade - exibir o valor combinado mostraria
   * na tela um total menor do que o cliente vai pagar.
   */
  private somaDoFretePorGrupo() : number {
    return Array.from(this.agruparPorGroupNum().values())
      .reduce((acc, itens) => acc + this.freteDoGrupo(itens), 0)
  }

  /**
   * Frete digitado dividido entre os documentos proporcionalmente a quantidade de cada grupo.
   * Trabalha em centavos e joga a sobra do arredondamento no ultimo, pra soma bater com o digitado.
   */
  private rateiaFreteManual(grupos : Item[][]) : number[] {
    const centavos = Math.round((Number(this.frete) || 0) * 100)
    const quantidades = grupos.map(itens => itens.reduce((acc,it) => acc + (Number(it.quantidade) || 0), 0))
    const total = quantidades.reduce((acc,q) => acc + q, 0)
    const partes = quantidades.map(q => total > 0 ? Math.floor(centavos * q / total) : 0)
    partes[partes.length - 1] += centavos - partes.reduce((acc,p) => acc + p, 0)
    return partes.map(p => p / 100)
  }

  private async saveOffline(documents : Array<PedidoVenda>){
    try{
      if(this.offlineEditId){
        await this.offlineQueue.edit(
          this.offlineEditId,
          documents[0],
          this.businesPartner.CardName,
          this.total()
        )
        if(documents.length > 1)
          await this.offlineQueue.enqueue(documents.slice(1), this.businesPartner.CardName, this.total())
        await this.alertService.info('Cotação offline atualizada.')
      }else{
        const receipts = await this.offlineQueue.enqueue(documents, this.businesPartner.CardName, this.total())
        await this.alertService.info(`Cotação salva no dispositivo. Protocolo: ${receipts.join(', ')}`)
      }
      this.loading = false
      this.router.navigate(['/venda/offline'])
    }catch(error : any){
      this.loading = false
      this.alertService.error(error?.message || 'Não foi possível salvar a cotação offline')
    }
  }

  private async loadOfflineQuotation(localId : string){
    const record = await this.offlineQueue.get(localId)
    if(!record || !['PENDING','ERROR'].includes(record.status)){
      this.alertService.error('A cotação offline não está disponível para edição')
      return
    }
    const quotation = record.quotation
    this.offlineEditId = localId
    this.branchId = quotation.BPL_IDAssignedToInvoice
    const branch = await this.offlineCatalog.get('branches', String(this.branchId))
    this.selectedBranch = Object.assign(new Branch(), branch)
    const partner = await this.offlineCatalog.get('businessPartners', quotation.CardCode)
    this.businesPartner = Object.assign(new BusinessPartner(), partner)
    this.formaPagamento = quotation.PaymentMethod
    this.observacao = quotation.Comments
    this.dtEntrega = quotation.DocDueDate
    this.frete = quotation.Frete || 0
    this.freteCalculado = true
    this.tipoEnvio = quotation.TaxExtension?.Incoterms == 9 ? 'ret' : 'ent'
    this.tipoOperacao = quotation.DocumentLines?.[0]?.Usage
    if(quotation.shipToCode)
      this.enderecoEntrega = this.businesPartner.getAddressOptions('bo_ShipTo')
        .map(option => option.value as unknown as BPAddress)
        .find(address => address.AddressName == quotation.shipToCode) || null
    const products = await this.offlineCatalog.all('products')
    const paymentTerms = await this.offlineCatalog.all('paymentTerms')
    this.itens = (quotation.DocumentLines || []).map(line => {
      const stored = products.find(entry => Number(entry.branchId) == Number(this.branchId)
        && entry.product?.ItemCode == line.ItemCode
        && (!line.PriceList || Number(entry.product?.PriceList) == Number(line.PriceList)))?.product || {}
      const item = Object.assign(new Item(), stored)
      item.ItemCode = line.ItemCode
      item.ItemDescription = line.ItemDescription || item.ItemDescription
      item.PriceList = String(line.PriceList || item.PriceList)
      item.quantidade = Number(line.Quantity)
      item.GroupNum = quotation.PaymentGroupCode
      item.descontoVendedorPorcentagem = Number(line.DiscountPercent || 0)
      const term = paymentTerms
        .find(entry => String(entry.priceList) === String(item.PriceList))?.terms
        ?.find(value => String(value.GroupNum) === String(quotation.PaymentGroupCode))
      item.descontoCondicaoPagamento = Number(term?.U_desconto || 0)
      item.jurosCondicaoPagamento = Number(term?.U_juros || 0)
      const negotiated = Number(line.U_preco_negociado ?? line.UnitPrice ?? item.UnitPrice ?? 0)
      const paymentFactor = (1 - item.descontoCondicaoPagamento / 100) * (1 + item.jurosCondicaoPagamento / 100)
      const sellerFactor = 1 - item.descontoVendedorPorcentagem / 100
      const totalFactor = paymentFactor * sellerFactor
      if(!item.UnitPrice || Math.abs(item.unitPriceLiquid() - negotiated) > 0.01)
        item.UnitPrice = totalFactor > 0 ? negotiated / totalFactor : negotiated
      this.selectedPaymentTerms[String(item.PriceList)] = term || {
        GroupNum: quotation.PaymentGroupCode,
        ListNum: String(item.PriceList)
      }
      return item
    })
    this.recalcularFrete()
  }

  concluirEnvio(redirectRoute: string){
    this.alertService.info("Seu pedido foi Enviado").then(() => {
      this.loading = false
      this.limparFormulario(redirectRoute)
    })
  }

  concluirEnvioPendente(pendentes: Array<any>, redirectRoute: string){
    const motivos = [...new Set(pendentes.map(p => p.motivo))].join(', ')
    this.alertService.info(
      `Seu documento foi enviado para autorização (motivo: ${motivos}) e aguarda liberação antes de ser criado no SAP.`
    ).then(() => {
      this.loading = false
      this.limparFormulario(redirectRoute)
    })
  }

  limparFormulario(redirectRoute: string = 'venda/cotacao'){
    this.router.navigateByUrl('/RefreshComponent', { skipLocationChange: true }).then(() => {
      this.router.navigate([redirectRoute]);
    });
  }

  isFormValid() : boolean{
    return this.businesPartner
      && this.branchId
      && this.dtEntrega
      && this.formaPagamento
      && this.itens
      && this.tipoEnvio
      && this.tipoOperacao
      && this.itens?.length > 0
      && this.itens.filter(it => !it.GroupNum).length == 0
      && !this.freteErro
      && !this.calculandoFrete
      && (!this.freteManual || this.tipoEnvio != 'ent' || Number(this.frete) >= 0)
      && (!this.offlineMode || this.offline.hasValidCatalog)
  }

  agruparPorGroupNum(): Map<string, Item[]> {
    return this.itens.reduce((map, item) => {
        const group = item.GroupNum;
        if (!map.has(group)) {
            map.set(group, []);
        }
        map.get(group)?.push(item);
        return map;
    }, new Map<string, Item[]>());
  }
}
