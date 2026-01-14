  import { Component, DoCheck, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
  import { ActivatedRoute } from '@angular/router';

  import { Column } from '../../../../shared/components/table/column.model';
  import { ActionReturn } from '../../../../shared/components/action/action.model';
  import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';
  import { BusinessPartner } from '../../../../sap/model/business-partner/business-partner';
  import { DocumentList } from '../../../../sap/model/markting/document-list';
  import { OrdemCarregamento } from '../../models/ordem-carregamento';
  import { AlertService } from '../../../../shared/service/alert.service';
  import { OrdemCarregamentoService } from '../../service/ordem-carregamento.service';
  import { BusinessPartnerService } from '../../../sap-shared/_services/business-partners.service';
  import { PedidosVendaService } from '../../../../sap/service/document/pedidos-venda.service';
  import { ParameterService } from '../../../../shared/service/parameter.service';
import { OrdemCarregamentoPdfService } from '../../ordem-carregamento-pdf/ordem-carregamento-pdf.component';
import { RomaneioPdfService } from '../romaneio-pdf/romaneio-pdf.component';

  @Component({
    selector: 'app-ordem-selected',
    templateUrl: './selected.html',
    styleUrls: ['./selected.scss']
  })
  export class OrdemCarregamentoSelectedComponent implements OnInit, OnChanges {
    @Input() selected: OrdemCarregamento | null = null;
    @Output() back = new EventEmitter<void>();
    @Output() atualizaPedidos = new EventEmitter<OrdemCarregamento>();

    placa: string = '';
    nomeMotorista: string = '';
    pesoCaminhao: number | null = null;
    formTouched: boolean = false;

    loading: boolean = false;
    loadingPedidos: boolean = false;
    
    showItinerarioModal: boolean = false;
    showLoteModal: boolean = false;

    notas: DocumentList[] = [];
    flattened: any[] = [];
    businessPartner: BusinessPartner | null = null;
    localidadesMap: Map<string, string> = new Map();

    private lastSelectedDocEntry: number | null = null;
    private lastPedidosRef: any[] | null = null;

    definition: Column[] = [
      new Column('Núm. do Pedido', 'DocNum'),
      new Column('Cód. Cliente', 'CardCode'),
      new Column('Nome Cliente', 'CardName'),
      new Column('Localidade', 'Name'),
      new Column('Vendedor', 'SlpName'),
      new Column('Frete', 'DistribSum'),
      new Column('Cód. Item', 'ItemCode'),
      new Column('Dsc. Item', 'Dscription'),
      new Column('Quantidade', 'Quantity'),
      new Column('Un. Medida', 'UomCode')
    ];

    notasEmitida = [
      new Column('Núm. da Nota', 'SequenceSerial'),
      new Column('Núm. do Documento', 'DocNum'),
      new Column('Cód. Cliente', 'CardCode'),
      new Column('Nome Cliente', 'CardName'),
      new Column('Cód. Item', 'ItemCode'),
      new Column('Dsc. Item', 'ItemDescription'),
      new Column('Quantidade', 'Quantity'),
      new Column('Valor', 'LineTotal'),
    ];

    constructor(
      private alertService: AlertService,
      private ordemCarregamentoService: OrdemCarregamentoService,
      private businessPartnerService: BusinessPartnerService,
      private pedidosVendaService: PedidosVendaService,
      private parameterService: ParameterService,
      private route: ActivatedRoute,
      private pdfService: OrdemCarregamentoPdfService,
      private romaneioPdfService: RomaneioPdfService
    ) {}

    ngOnInit(): void {
      this.hydrateFromSelected();
      this.loadNotas();
    }

    ngOnChanges(changes: SimpleChanges): void {
      if (changes['selected']) {
        this.hydrateFromSelected();
      }
    }

    imprimirOrdemPdf(): void {
      if (this.selected) {
        const transportadora = this.businessPartner?.CardName || '';
        this.pdfService.gerarPdf(this.selected, transportadora);
      }
    }

    private loadNotas() {
      if (!this.selected?.DocEntry) return;
      
      this.loading = true;
      this.ordemCarregamentoService.getNotasByCarregamentos(this.selected.DocEntry).subscribe({
        next: (docs) => {
          this.notas = docs;
          this.flattened = this.notas.flatMap((nota) =>
            nota.DocumentLines.map((line) => ({
              SequenceSerial: nota.SequenceSerial,
              DocNum: nota.DocNum,
              CardCode: nota.CardCode,
              CardName: nota.CardName,
              ItemCode: line.ItemCode,
              ItemDescription: line.ItemDescription,
              Quantity: line.Quantity,
              LineTotal: line.LineTotal,
            }))
          );
          this.loading = false;
        },
        error: (err) => {
          console.error('Erro ao carregar notas', err);
          this.loading = false;
        }
      });
    }

    cancelarOrdem(): void {
        if (!this.selected) return;

        if (this.alertService.confirm('Tem certeza que deseja cancelar esta Ordem de Carregamento? Isso irá desvincular todos os pedidos.')) {
            this.loading = true;
            this.ordemCarregamentoService.cancelar(this.selected.DocEntry).subscribe({
                next: (res) => {
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
      this.nomeMotorista = this.selected.U_motorista || '';
      this.pesoCaminhao = this.selected.U_capacidadeCaminhao || null;

      if (this.lastSelectedDocEntry !== this.selected.DocEntry) {
        this.lastSelectedDocEntry = this.selected.DocEntry ?? null;
        this.lastPedidosRef = null;
      }
    }

    private resetState() {
      this.placa = '';
      this.nomeMotorista = '';
      this.pesoCaminhao = null;
      this.lastSelectedDocEntry = null;
      this.lastPedidosRef = null;
    }

    selectBp(event: BusinessPartner): void {
      this.businessPartnerService.get(event.CardCode).subscribe({
        next: (bp) => this.businessPartner = bp,
        error: () => this.alertService.error('Erro ao carregar dados do parceiro.')
      });
    }


    iniciarGeracaoNota(): void {
      if (this.selected.pedidosVenda.length === 0) {
        this.alertService.error('Nenhum pedido disponível para gerar nota fiscal.');
        return;
      }
      this.showLoteModal = true;
    }

    onLotesConfirmados(mapaLotes: Map<string, BatchStock[]>): void {
      if (mapaLotes.size === 0) return;

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

      this.ordemCarregamentoService.saveSelectedLotes(this.selected!.DocEntry, lotesToSave).subscribe({
        next: () => {
          this.alertService.confirm('Nota fiscal confirmada com sucesso!');
          this.atualizarStatusParaFechado();
          this.showLoteModal = false; 
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
      if (!this.validateForm()) return;
      
      this.loading = true;
      const pesoString = this.pesoCaminhao ? String(this.pesoCaminhao) : null;

      const dados = {
        U_placa: this.placa,
        U_motorista: this.nomeMotorista,
        U_capacidadeCaminhao: pesoString,
        U_transportadora: this.businessPartner?.CardCode || null 
      };

      this.ordemCarregamentoService.atualizarLogistica(this.selected!.DocEntry, dados).subscribe({
        next: () => {
          this.alertService.confirm('Dados de logística salvos com sucesso!');
          if (this.selected) {
            this.selected.U_placa = this.placa;
            this.selected.U_motorista = this.nomeMotorista;
            this.selected.U_capacidadeCaminhao = this.pesoCaminhao;
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
        this.parameterService.removeParam(this.route, "id");
        this.parameterService.setParam(this.route, "edit", this.selected!.DocEntry.toString());
      }
    }

    voltar(): void {
      this.back.emit();
    }

    private validateForm(): boolean {
      this.formTouched = true;
      if (!this.placa || !this.nomeMotorista) {
        this.alertService.error('A placa do veículo e o nome do motorista são obrigatórios.');
        return false;
      }
      return true;
    }

    private atualizarStatusParaFechado(): void {
      this.loading = true;
      this.ordemCarregamentoService.atualizarStatus(this.selected!.DocEntry, { U_Status: 'Fechado' }).subscribe({
        next: () => {
          if (this.selected) this.selected.U_Status = 'Fechado';
        },
        error: (err) => this.alertService.error('Erro ao atualizar status: ' + err.message),
        complete: () => this.loading = false
      });
    }
  }