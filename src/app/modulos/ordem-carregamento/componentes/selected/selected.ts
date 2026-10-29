import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { Column } from '../../../../shared/components/table/column.model';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';
import { BusinessPartner } from '../../../../sap/model/business-partner/business-partner';
import { DocumentList } from '../../../../sap/model/markting/document-list';
import { RouteLink } from '../../../../sap/model/route-link';
import { OrdemCarregamento, escaparHtml } from '../../models/ordem-carregamento';
import { AlertService } from '../../../../shared/service/alert.service';
import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';
import { BusinessPartnerService } from '../../../sap-shared/_services/business-partners.service';
import { PedidosVendaService } from '../../../../sap/service/document/pedidos-venda.service';
import { ParameterService } from '../../../../shared/service/parameter.service';
import { OrdemCarregamentoPdfService } from '../../ordem-carregamento-pdf/ordem-carregamento-pdf.component';
import { RomaneioPdfService } from '../romaneio-pdf/romaneio-pdf.component';
import { PedidoX } from '../../modals/selecao-lotes-modal-pedido/selecao-lotes-modal-pedido.component';
import { FATURA_RESERVA, chaveEntrada, isFaturaReserva } from '../../models/fatura-reserva';
import { PdfCarregamentoService } from '../../service/pdf-carregamento.service';
import { LinhaOrdem } from '../../models/linha-ordem';

@Component({
  selector: 'app-ordem-selected',
  templateUrl: './selected.html',
  styleUrls: ['./selected.scss']
})
export class OrdemCarregamentoSelectedComponent implements OnInit, OnChanges {
  @Input() selected: OrdemCarregamento | null = null;
  @Output() back = new EventEmitter<void>();
  @Output() atualizaPedidos = new EventEmitter<OrdemCarregamento>();
  @ViewChild('ordemExportImagem') ordemExportImagem?: ElementRef<HTMLElement>;

  placa: string = '';
  nomeMotorista: string = '';
  pesoCaminhao: number | null = null;
  formTouched: boolean = false;

  loading: boolean = false;
  loadingPedidos: boolean = false;

  showItinerarioModal: boolean = false;
  showLoteModal: boolean = false;
  showLoteModalPedido: boolean = false;
  showExportMenu: boolean = false;
  baixandoDanfes = false;
  // Capacidade do caminhao (opcional), gravada em U_capacidadeCaminhao.
  capacidade: number | null = null;

  notas: DocumentList[] = [];
  flattened: any[] = [];
  historico: any[] = [];
  historicoColunas = [
    new Column('Data', 'Data'),
    new Column('Usuário', 'Usuario'),
    new Column('Ação', 'Acao'),
    new Column('Status', 'Status'),
    new Column('Placa', 'Placa'),
    new Column('Motorista', 'Motorista'),
    new Column('Retiradas de NF', 'RetiradasTexto'),
  ];
  // Mensagem da TaxPlus de cada nota nao autorizada, por "tipo-DocEntry".
  private motivosNfe = new Map<string, string>();
  businessPartner: BusinessPartner | null = null;
  localidadesMap: Map<string, string> = new Map();

  private lastSelectedDocEntry: number | null = null;
  private lastPedidosRef: any[] | null = null;

  pedidosVendaCarregados: boolean = false;

  itemsParaSelecaoLote: any[] = [];
  pedidosXAuxiliares: PedidoX[] = [];

  definition: Column[] = [
    new Column('Documento', 'orderRouterLink'),
    new Column('Tipo', 'tipo', '{{{value}}}'),
    new Column('Cód. Cliente', 'routerLink'),
    new Column('Nome Cliente', 'CardName'),
    new Column('Localidade', 'Name'),
    new Column('Vendedor', 'SlpName'),
    new Column('Cód. Item', 'ItemCode'),
    new Column('Dsc. Item', 'Dscription'),
    new Column('Quantidade', 'Quantity'),
    new Column('Un. Medida', 'UomCode'),
    new Column('Peso (kg)', 'pesoFormatado'),
    new Column('Frete', 'freteFormatado')
  ];

  notasEmitida = [
    new Column('Tipo', 'Tipo'),
    new Column('Status NF-e', 'StatusNfe', '{{{value}}}'),
    new Column('Núm. da Nota', 'SequenceSerial'),
    new Column('Núm. do Documento', 'DocLink'),
    new Column('Cód. Cliente', 'CardLink'),
    new Column('Nome Cliente', 'CardName'),
    new Column('Cód. Item', 'ItemCode'),
    new Column('Dsc. Item', 'ItemDescription'),
    new Column('Quantidade', 'Quantity'),
    new Column('Valor', 'LineTotalCurrency'),
  ];

  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService,
    private businessPartnerService: BusinessPartnerService,
    private pedidosVendaService: PedidosVendaService,
    private parameterService: ParameterService,
    private route: ActivatedRoute,
    private pdfService: OrdemCarregamentoPdfService,
    private romaneioPdfService: RomaneioPdfService,
    private pdfCarregamentoService: PdfCarregamentoService
  ) {}

  // A carga inicial vem do primeiro ngOnChanges do @Input selected.
  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selected']) {
      this.notas = [];
      this.flattened = [];
      this.historico = [];
      this.hydrateFromSelected();
      this.loadNotas();
    }
  }

  imprimirOrdemPdf(): void {
    this.showExportMenu = false;

    if (this.selected) {
      const transportadora = this.businessPartner?.CardName || '';
      this.pdfService.gerarPdf(this.selected, transportadora);
    }
  }

  async exportarOrdemImagem(): Promise<void> {
    this.showExportMenu = false;

    if (!this.selected || !this.ordemExportImagem?.nativeElement) {
      return;
    }

    try {
      this.loading = true;
      await this.pdfCarregamentoService.gerarImagem(
        this.ordemExportImagem.nativeElement,
        `Ordem_Carregamento_${this.selected.DocEntry}`
      );
    } catch (error: any) {
      this.alertService.error('Erro ao exportar imagem: ' + (error?.message || error));
    } finally {
      this.loading = false;
    }
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  private historicoSeq = 0;

  private loadHistorico(): void {
    const docEntry = this.selected?.DocEntry;
    if (!docEntry) return;
    // Carga inicial e recarga ao salvar logistica podem se cruzar: so vale a ultima pedida.
    const seq = ++this.historicoSeq;
    this.ordemCarregamentoService.historico(docEntry).pipe(catchError(() => of([]))).subscribe(versoes => {
      if (this.selected?.DocEntry !== docEntry || seq !== this.historicoSeq) return;
      // Mais recente primeiro. Versao gravada antes do historico existir fica sem usuario/acao.
      // A tabela poe o valor em innerHTML sem sanitizar: placa e motorista sao digitados por usuarios e a acao
      // traz a mensagem do SAP, entao tudo que e texto livre passa por escaparHtml.
      this.historico = versoes.slice().reverse().map(v => ({
        Data: this.dataHoraSap(v.UpdateDate, v.UpdateTime),
        Usuario: escaparHtml(v.Usuario || '—'),
        Acao: escaparHtml(v.Acao || '—'),
        Status: escaparHtml(v.Status || ''),
        Placa: escaparHtml(v.Placa || ''),
        Motorista: escaparHtml(v.Motorista || ''),
        RetiradasTexto: Number(v.Retiradas) ? `${v.Retiradas} linha(s), ${Number(v.QtdRetirada).toLocaleString('pt-BR')}` : '',
      }));
    });
  }

  // UpdateTime do SAP e HHMM num inteiro (ex.: 1355).
  private dataHoraSap(data?: string, hora?: number): string {
    if (!data) return '';
    const [ano, mes, dia] = data.slice(0, 10).split('-');
    const hhmm = String(hora ?? 0).padStart(4, '0');
    return `${dia}/${mes}/${ano} ${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;
  }

  private notasSeq = 0;

  private loadNotas() {
    if (!this.selected?.DocEntry) return;
    this.loadHistorico();

    this.loading = true;
    // A -> B -> A: a resposta da primeira carga de A nao pode repor notas antigas sobre a segunda.
    const seq = ++this.notasSeq;
    // Status da NF-e vem da TaxPlus pelo sap-odbc; se falhar, a lista sai sem status.
    const status$ = this.ordemCarregamentoService.statusNotas(this.selected.DocEntry).pipe(catchError(() => of([])));
    const docEntry = this.selected.DocEntry;
    forkJoin([this.ordemCarregamentoService.getNotasByCarregamentos(docEntry), status$]).subscribe({
      next: ([docs, status]) => {
        if (this.selected?.DocEntry !== docEntry || seq !== this.notasSeq) return;
        const statusPorDoc = new Map(status.map(s => [`${s.DocType}-${s.DocEntry}`, s]));
        this.notas = docs;
        this.motivosNfe.clear();
        this.flattened = this.notas.flatMap((nota) =>
          nota.DocumentLines.map((line) => {
            // entrega = retirada de NF de venda futura; nao tem tela no front, fica sem link
            const entrega = (nota as any).DocObjectCode === 'oDeliveryNotes';
            const nfe = statusPorDoc.get(`${entrega ? 15 : 13}-${nota.DocEntry}`);
            // Motivo so para o que nao foi autorizado: a mensagem da TaxPlus (rejeicao da SEFAZ ou erro interno).
            const chave = `${entrega ? 15 : 13}-${nota.DocEntry}`;
            if (nfe?.Mensagem && nfe.Status !== 'Autorizado')
              this.motivosNfe.set(chave, `NF ${nota.SequenceSerial ?? nota.DocNum} (${nfe.Status}): ${nfe.Mensagem}`);
            return {
            Tipo: entrega ? 'Entrega' : 'Nota',
            StatusNfe: this.badgeStatusNfe(nfe?.Status, this.motivosNfe.has(chave) ? chave : undefined),
            SequenceSerial: nota.SequenceSerial,
            DocLink: entrega ? String(nota.DocNum) : new RouteLink(String(nota.DocNum), '/financeiro/notas-fiscais', { id: nota.DocEntry }),
            CardCode: nota.CardCode,
            CardLink: new RouteLink(nota.CardCode, '/clientes/parceiro-negocio/' + nota.CardCode),
            CardName: escaparHtml(nota.CardName ?? ''),
            ItemCode: line.ItemCode,
            ItemDescription: escaparHtml(line.ItemDescription ?? ''),
            Quantity: Number(line.Quantity).toLocaleString('pt-BR'),
            LineTotalCurrency: Number(line.LineTotal),
            };
          })
        );
        this.loading = false;
        // Faturada numa tentativa que gravou as notas e nao fechou a ordem: fecha agora.
        if (docs.length && this.selected?.U_Status === 'Aberto') {
          this.atualizarStatusParaFechado();
        }
      },
      error: (err) => {
        if (this.selected?.DocEntry !== docEntry) return;
        console.error('Erro ao carregar notas', err);
        this.loading = false;
      }
    });
  }

  // O selo e HTML da tabela (sem binding Angular): o clique no icone e pego aqui pelo data-motivo.
  verMotivo(evento: MouseEvent): void {
    const icone = (evento.target as HTMLElement).closest('[data-motivo]') as HTMLElement | null;
    if (!icone) return;
    evento.preventDefault();
    const motivo = this.motivosNfe.get(icone.dataset['motivo'] || '');
    if (motivo) this.alertService.error(motivo);
  }

  private badgeStatusNfe(status?: string, chaveMotivo?: string): string {
    const cor = status === 'Autorizado' ? 'success' : status === 'Rejeitado' ? 'danger' : 'secondary';
    const icone = chaveMotivo
      ? ` <a href="#" data-motivo="${chaveMotivo}" title="Ver motivo"><i class="fas fa-info-circle"></i></a>`
      : '';
    return `<span class="text-nowrap"><span class="badge badge-${cor}">${escaparHtml(status || 'Não enviada')}</span>${icone}</span>`;
  }

  baixarDanfes(): void {
    if (!this.selected?.DocEntry) return;
    const docEntry = this.selected.DocEntry;
    this.baixandoDanfes = true;
    this.ordemCarregamentoService.danfes(docEntry).subscribe({
      next: (zip) => {
        const url = URL.createObjectURL(zip);
        const link = document.createElement('a');
        link.href = url;
        link.download = `danfes-ordem-${docEntry}.zip`;
        link.click();
        URL.revokeObjectURL(url);
        this.baixandoDanfes = false;
      },
      error: () => {
        this.alertService.error('Erro ao baixar os DANFEs.');
        this.baixandoDanfes = false;
      }
    });
  }

  get ocupacaoCaminhao(): number {
    const capacidade = Number(this.selected?.U_capacidadeCaminhao) || 0;
    return capacidade > 0 ? Math.round(this.totalPesoPedidos / capacidade * 100) : 0;
  }

  cancelarOrdem(): void {
    if (!this.selected) return;

    if (this.alertService.confirm('Tem certeza que deseja cancelar esta Ordem de Carregamento? Isso irá desvincular todos os pedidos.')) {
      this.loading = true;
      this.ordemCarregamentoService.cancelar(this.selected.DocEntry).subscribe({
        next: () => {
          this.alertService.info('Ordem de Carregamento cancelada com sucesso!');
          if (this.selected) {
            this.selected.U_Status = 'Cancelado';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.alertService.error('Erro ao cancelar a Ordem de Carregamento: ' + (err.error?.message || err.message));
          this.loading = false;
        }
      });
    }
  }

  imprimirRomaneioAgrupado(): void {
    this.showExportMenu = false;

    if (!this.validateForm()) {
      return;
    }

    if (this.selected) {
      this.selected.U_placa = this.placa;
      this.selected.U_motorista = this.nomeMotorista;
      this.romaneioPdfService.gerarPdf(this.selected);
    }
  }

  private hydrateFromSelected(): void {
    if (!this.selected) {
      this.resetState();
      return;
    }

    this.placa = this.selected.U_placa || '';
    this.capacidade = this.selected.U_capacidadeCaminhao || null;
    this.nomeMotorista = this.selected.U_motorista || '';
    this.pesoCaminhao = this.totalPesoPedidos || null;

    if (this.selected.pedidosVendaCarregados && this.selected.pedidosVenda.length > 0) {
      this.syncPedidosState(this.selected.pedidosVenda);
    } else if (this.selected.DocEntry) {
      this.selected.pedidosVendaCarregados = false;
      const docEntry = this.selected.DocEntry;
      this.pedidosVendaService.search(docEntry).subscribe({
        next: (pedidos) => {
          // Trocou de ordem antes da resposta: descarta.
          if (this.selected?.DocEntry === docEntry) {
            this.syncPedidosState(this.normalizePedidosResponse(pedidos));
          }
        }
      });
    }

    if (this.lastSelectedDocEntry !== this.selected.DocEntry) {
      this.lastSelectedDocEntry = this.selected.DocEntry ?? null;
      this.lastPedidosRef = null;
    }
  }

  private agruparItensParaLote(pedidos: any[]): void {
    const grouped = pedidos.reduce((acc, current) => {
      const key = current.ItemCode;
      if (!acc[key]) {
        acc[key] = { ...current, Quantity: 0 };
      }
      acc[key].Quantity += current.Quantity;
      return acc;
    }, {} as { [key: string]: any });

    this.itemsParaSelecaoLote = Object.values(grouped);
  }

  private resetState() {
    this.placa = '';
    this.nomeMotorista = '';
    this.pesoCaminhao = null;
    this.lastSelectedDocEntry = null;
    this.lastPedidosRef = null;
    this.pedidosXAuxiliares = [];
  }

  selectBp(event: BusinessPartner): void {
    if (!this.ordemAberta) return;
    this.businessPartnerService.get(event.CardCode).subscribe({
      next: (bp) => this.businessPartner = bp,
      error: () => this.alertService.error('Erro ao carregar dados do parceiro.')
    });
  }

  iniciarGeracaoNota(): void {
    if (!this.selected || this.selected.pedidosVenda.length === 0) {
      this.alertService.error('Nenhum pedido disponível para gerar nota fiscal.');
      return;
    }

    if (!this.validateNotaFiscalLogistics()) {
      return;
    }

    this.pedidosXAuxiliares = this.criarEstruturaPedidoX(this.selected.pedidosVenda);
    this.showLoteModalPedido = true;
  }

  onLotesConfirmados(mapaLotes: Map<string, BatchStock[]>): void {
    if (mapaLotes.size === 0 || !this.selected) return;

    this.loading = true;

    const lotesToSave = Array.from(mapaLotes.entries()).map(([itemCode, lotes]) => ({
      ItemCode: itemCode,
      Batches: lotes.map(lote => ({
        BatchNumber: lote.DistNumber,
        ExpDate: lote.ExpDate,
        InDate: lote.InDate,
        ItemName: lote.ItemName,
        MnfDate: lote.MnfDate,
        Quantity: lote.quantitySelecionadaEditable || lote.Quantity,
        WhsCode: lote.WhsCode
      }))
    }));

    const ordem = this.selected;
    this.ordemCarregamentoService.saveSelectedLotes(ordem.DocEntry, lotesToSave).subscribe({
      next: () => {
        this.alertService.confirm('Nota fiscal confirmada com sucesso!');
        // O backend fecha a ordem ao gerar as notas; se o usuario ja trocou de ordem, so marca a do envio.
        ordem.U_Status = 'Fechado';
        if (this.selected === ordem) this.loadNotas();
        this.showLoteModal = false;
      },
      error: (error) => {
        this.alertService.error('Erro ao confirmar nota: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  onLotesPedidoConfirmados(pedidosX: PedidoX[]): void {
    if (!this.selected || !pedidosX || pedidosX.length === 0) {
      return;
    }

    this.loading = true;
    this.pedidosXAuxiliares = pedidosX;

    const lotesToSave = this.construirPayloadLotesPorItem(pedidosX);
    if (lotesToSave.length === 0) {
      this.alertService.error('Nenhum lote foi selecionado.');
      this.loading = false;
      return;
    }

    const ordem = this.selected;
    this.ordemCarregamentoService.saveSelectedLotes(ordem.DocEntry, lotesToSave).subscribe({
      next: () => {
        this.alertService.confirm('Nota fiscal confirmada com sucesso!');
        // O backend fecha a ordem ao gerar as notas; se o usuario ja trocou de ordem, so marca a do envio.
        ordem.U_Status = 'Fechado';
        if (this.selected === ordem) this.loadNotas();
        this.showLoteModalPedido = false;
      },
      error: (error) => {
        this.alertService.error('Erro ao confirmar nota: ' + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  abrirModalItinerario(): void {
    if (!this.selected || this.selected.pedidosVenda.length === 0) {
      this.alertService.error('Nenhum pedido disponível para gerar itinerário.');
      return;
    }

    this.localidadesMap.clear();

    this.selected.pedidosVenda.forEach(pedido => {
      if (pedido.CardCode && pedido.Name) {
        this.localidadesMap.set(pedido.CardCode, pedido.Name);
      }
    });

    this.showItinerarioModal = true;
  }

  salvarLogistica(): void {
    if (!this.ordemAberta || !this.validateForm()) return;

    this.loading = true;

    const dados = {
      U_placa: this.placa,
      U_motorista: this.nomeMotorista,
      U_capacidadeCaminhao: this.capacidade ? String(this.capacidade) : null,
      U_transportadora: this.businessPartner?.CardCode || null
    };

    this.ordemCarregamentoService.atualizarLogistica(this.selected!.DocEntry, dados).subscribe({
      next: () => {
        this.alertService.confirm('Dados de logística salvos com sucesso!');
        this.loadHistorico();
        if (this.selected) {
          this.selected.U_placa = this.placa;
          this.selected.U_motorista = this.nomeMotorista;
          this.selected.U_capacidadeCaminhao = this.capacidade;
          this.selected.U_transportadora = this.businessPartner?.CardCode;
        }
      },
      error: (err) => {
        this.alertService.error('Erro ao salvar logística: ' + (err.error?.message || err.message));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  editarOrdem(): void {
    if (this.selected?.U_Status === 'Fechado' || this.selected?.U_Status === 'Cancelado') {
      this.alertService.error('Não é possível editar uma ordem fechada ou cancelada.');
    } else {
      this.parameterService.removeParam(this.route, 'id');
      this.parameterService.setParam(this.route, 'edit', this.selected!.DocEntry.toString());
    }
  }

  voltar(): void {
    this.back.emit();
  }

  canGenerateNotaFiscal(): boolean {
    return this.hasRequiredPlate() && this.hasRequiredDriver() && this.hasRequiredTruckWeight();
  }

  private validateForm(): boolean {
    this.formTouched = true;
    if (!this.hasRequiredPlate() || !this.hasRequiredDriver()) {
      this.alertService.error('A placa do veículo e o nome do motorista são obrigatórios.');
      return false;
    }
    if (Number(this.capacidade) < 0) {
      this.alertService.error('A capacidade do caminhão não pode ser negativa.');
      return false;
    }
    return true;
  }

  private validateNotaFiscalLogistics(): boolean {
    this.formTouched = true;

    if (!this.hasRequiredPlate() || !this.hasRequiredDriver() || !this.hasRequiredTruckWeight()) {
      this.alertService.error('Para gerar a nota fiscal, preencha placa, nome do motorista e peso do caminhão.');
      return false;
    }

    return true;
  }

  private hasRequiredPlate(): boolean {
    return this.placa.trim().length > 0;
  }

  private hasRequiredDriver(): boolean {
    return this.nomeMotorista.trim().length > 0;
  }

  private hasRequiredTruckWeight(): boolean {
    return this.totalPesoPedidos > 0;
  }

  private syncPedidosState(pedidos: any[]): void {
    if (!this.selected) {
      return;
    }

    this.selected.pedidosVenda = pedidos.map(pedido => Object.assign(new LinhaOrdem(), pedido));
    this.selected.pedidosVendaCarregados = true;
    this.pesoCaminhao = this.totalPesoPedidos || null;
    this.agruparItensParaLote(pedidos);
    this.pedidosXAuxiliares = this.criarEstruturaPedidoX(pedidos);
  }

  // Ordem com nota emitida esta faturada, mesmo que o status no SAP nao tenha virado Fechado.
  get ordemAberta(): boolean {
    return this.selected?.U_Status === 'Aberto' && !this.notas?.length;
  }

  get totalDocumentos(): number {
    return new Set((this.selected?.pedidosVenda || []).map(chaveEntrada)).size;
  }

  get totalFrete(): number {
    return (this.selected?.pedidosVenda || []).reduce((acc, pedido) => acc + Number(pedido.DistribSum || 0), 0);
  }

  get totalPesoPedidos(): number {
    return (this.selected?.pedidosVenda || []).reduce((acc, pedido) =>
      acc + Number(pedido.Weight1 || 0), 0
    );
  }

  get totalItensPedidos(): number {
    return (this.selected?.pedidosVenda || []).reduce((acc, pedido) =>
      acc + Number(pedido.Quantity || 0), 0
    );
  }

  formatPesoPedidos(): string {
    return this.totalPesoPedidos.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDecimal(value: number | string | null | undefined): string {
    return (Number(value) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  get transportadoraNome(): string {
    return this.businessPartner?.CardName || 'N/A';
  }

  private normalizePedidosResponse(response: any): any[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response?.content)) {
      return response.content.map((pedido) => Object.assign(new DocumentList(), pedido));
    }

    if (Array.isArray(response)) {
      return response.map((pedido) => Object.assign(new DocumentList(), pedido));
    }

    return [Object.assign(new DocumentList(), response)];
  }

  private atualizarStatusParaFechado(): void {
    // A resposta pode chegar depois de o usuario trocar de ordem: atualiza a ordem da requisicao.
    const ordem = this.selected!;
    this.loading = true;
    this.ordemCarregamentoService.atualizarStatus(ordem.DocEntry, { U_Status: 'Fechado' }).subscribe({
      next: () => ordem.U_Status = 'Fechado',
      error: (err) => {
        this.alertService.error('Erro ao atualizar status: ' + err.message);
        if (this.selected === ordem) this.loading = false;
      },
      complete: () => { if (this.selected === ordem) this.loading = false; }
    });
  }

  private criarEstruturaPedidoX(pedidos: any[]): PedidoX[] {
    const pedidosPorDocEntry = new Map<string, PedidoX>();

    pedidos.forEach((pedido, index) => {
      const docEntry = Number(pedido.DocEntry) || 0;
      // pedido e fatura de reserva podem ter o mesmo DocEntry
      const chavePedido = docEntry ? chaveEntrada(pedido) : `${index + 1}`;
      const pedidoId = chavePedido;

      if (!pedidosPorDocEntry.has(chavePedido)) {
        pedidosPorDocEntry.set(chavePedido, {
          pedidoId,
          docEntry: docEntry,
          baseType: isFaturaReserva(pedido) ? FATURA_RESERVA : undefined,
          docNum: Number(pedido.DocNum) || docEntry,
          cardCode: pedido.CardCode || '',
          cardName: pedido.CardName || '',
          itens: []
        });
      }

      const itemId = `${pedidoId}-${pedido.ItemCode || ''}-${pedido.BaseLine ?? index}`;

      pedidosPorDocEntry.get(chavePedido)!.itens.push({
        itemId,
        itemCode: pedido.ItemCode || '',
        baseLine: pedido.BaseLine,
        descricao: pedido.Dscription || pedido.ItemDescription || '',
        quantidade: Number(pedido.Quantity) || 0,
        deposito: pedido.DflWhs || pedido.WarehouseCode || '',
        lotesSelecionados: []
      });
    });

    return Array.from(pedidosPorDocEntry.values());
  }

  private construirPayloadLotesPorItem(pedidosX: PedidoX[]): any[] {
    const resultado: any[] = [];

    pedidosX.forEach(pedido => {
      pedido.itens.forEach(item => {
        if (item.lotesSelecionados.length === 0) return;

        resultado.push({
          DocEntry: pedido.docEntry,
          BaseType: pedido.baseType,
          BaseLine: pedido.baseType === FATURA_RESERVA ? item.baseLine : undefined,
          ItemCode: item.itemCode,
          Batches: item.lotesSelecionados.map(lote => ({
            BatchNumber: lote.DistNumber,
            ExpDate: lote.ExpDate,
            InDate: lote.InDate,
            ItemName: lote.ItemName,
            MnfDate: lote.MnfDate,
            Quantity: Number(lote.quantitySelecionadaEditable ?? lote.Quantity) || 0,
            WhsCode: lote.WhsCode
          }))
        });
      });
    });

    return resultado;
  }
}
