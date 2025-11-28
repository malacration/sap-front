  import { Component, DoCheck, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
  import { ActivatedRoute } from '@angular/router';

  // Models e Services
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

  @Component({
    selector: 'app-ordem-selected',
    templateUrl: './selected.html',
    styleUrls: ['./selected.scss']
  })
  export class OrdemCarregamentoSelectedComponent implements OnInit, OnChanges, DoCheck {
    @Input() selected: OrdemCarregamento | null = null;
    @Output() back = new EventEmitter<void>();

    // Dados do Formulário
    placa: string = '';
    nomeMotorista: string = '';
    pesoCaminhao: number | null = null;
    formTouched: boolean = false;

    // Estados de Carregamento
    loading: boolean = false;
    loadingPedidos: boolean = false;
    
    // Controle de Exibição dos Modais (Booleanos Simples)
    showItinerarioModal: boolean = false;
    showRomaneioModal: boolean = false;
    showLoteModal: boolean = false;

    // Dados de Negócio
    notas: DocumentList[] = [];
    flattened: any[] = [];
    pedidos: any[] = [];
    businessPartner: BusinessPartner | null = null;
    localidadesMap: Map<string, string> = new Map();

    // Controles de mudança
    private lastSelectedDocEntry: number | null = null;
    private lastPedidosRef: any[] | null = null;

    // Definições de Tabela
    definition: Column[] = [
      new Column('Núm. do Pedido', 'DocNum'),
      new Column('Cód. Cliente', 'CardCode'),
      new Column('Nome Cliente', 'CardName'),
      new Column('Localidade', 'Localidade'),
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

    ngDoCheck(): void {
      if (!this.selected) return;

      const currentPedidos = this.selected.pedidosVenda;
      if (
        this.selected.pedidosVendaCarregados &&
        currentPedidos &&
        currentPedidos !== this.lastPedidosRef
      ) {
        this.loadPedidos();
      }
    }

    // --- CARREGAMENTO DE DADOS ---

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

    loadPedidos(): void {
      this.loadingPedidos = true;
      if (!this.selected) {
        this.pedidos = [];
        this.loadingPedidos = false;
        return;
      }

      const pedidosOrigem = Array.isArray(this.selected.pedidosVenda) ? this.selected.pedidosVenda : [];
      const pedidosAgrupados = this.groupPedidos(pedidosOrigem);

      this.selected.pedidosVenda = pedidosAgrupados;
      this.lastPedidosRef = this.selected.pedidosVenda;
      this.pedidos = this.selected.pedidosVenda;
      
      this.loadingPedidos = false;
    }

    private hydrateFromSelected(): void {
      if (!this.selected) {
        this.resetState();
        return;
      }

      this.placa = this.selected.U_placa || '';
      this.nomeMotorista = this.selected.U_motorista || '';
      this.pesoCaminhao = this.selected.U_pesoCaminhao || null;

      if (this.lastSelectedDocEntry !== this.selected.DocEntry) {
        this.lastSelectedDocEntry = this.selected.DocEntry ?? null;
        this.lastPedidosRef = null;
        this.pedidos = [];
      }

      if (this.selected.pedidosVendaCarregados && this.selected.pedidosVenda !== this.lastPedidosRef) {
        this.loadPedidos();
      }
    }

    private resetState() {
      this.placa = '';
      this.nomeMotorista = '';
      this.pesoCaminhao = null;
      this.pedidos = [];
      this.lastSelectedDocEntry = null;
      this.lastPedidosRef = null;
    }

    private groupPedidos(content: any[]): any[] {
      const groupedPedidos = content.reduce((acc: any, pedido: any) => {
        const itemCode = pedido.ItemCode;
        if (!acc[itemCode]) {
          acc[itemCode] = { ...pedido, Quantity: 0, DocNum: pedido.DocNum };
        }
        acc[itemCode].Quantity += pedido.Quantity;
        return acc;
      }, {});
      return Object.values(groupedPedidos);
    }

    selectBp(event: BusinessPartner): void {
      this.businessPartnerService.get(event.CardCode).subscribe({
        next: (bp) => this.businessPartner = bp,
        error: () => this.alertService.error('Erro ao carregar dados do parceiro.')
      });
    }

    // --- AÇÕES DO USUÁRIO (ABERTURA DE MODAIS E SALVAMENTOS) ---

    // 1. AÇÃO: Gerar Nota Fiscal (Abre Modal de Seleção)
    iniciarGeracaoNota(): void {
      if (this.pedidos.length === 0) {
        this.alertService.error('Nenhum pedido disponível para gerar nota fiscal.');
        return;
      }
      this.showLoteModal = true;
    }

    // Evento recebido do Modal Filho (<app-selecao-lotes-modal>)
    onLotesConfirmados(mapaLotes: Map<string, BatchStock[]>): void {
      if (mapaLotes.size === 0) return;

      this.loading = true;
      
      // Transforma o Mapa recebido do filho no JSON esperado pela API
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
          this.showLoteModal = false; // Fecha modal
        },
        error: (error) => {
          this.alertService.error('Erro ao confirmar nota: ' + (error.error?.message || error.message));
          this.loading = false;
        }
      });
    }

    // 2. AÇÃO: Itinerário (Prepara dados e Abre Modal)
    async abrirModalItinerario(): Promise<void> {
      if (this.pedidos.length === 0) {
        this.alertService.error('Nenhum pedido disponível para gerar itinerário.');
        return;
      }
      
      this.loading = true;
      try {
        // O pai carrega as localidades necessárias para o filho exibir
        const promises = this.pedidos.map(pedido =>
          this.pedidosVendaService.searchLocalidade(20).toPromise()
        );
        const results = await Promise.all(promises);
        
        results.forEach((res, index) => {
          if (res && res.content?.length > 0) {
            this.localidadesMap.set(this.pedidos[index].CardCode, res.content[0].Name);
          }
        });
        
        this.showItinerarioModal = true; // Abre o modal
      } catch (error: any) {
        this.alertService.error('Erro ao carregar localidades: ' + (error.message || 'Erro desconhecido'));
      } finally {
        this.loading = false;
      }
    }

    // 3. AÇÃO: Romaneio (Valida e Abre Modal)
    abrirModalRomaneio(): void {
      if (this.pedidos.length === 0) {
        this.alertService.error('Nenhum pedido disponível para gerar romaneio.');
        return;
      }
      if (this.validateForm()) {
        this.showRomaneioModal = true;
      }
    }

    // --- OUTRAS AÇÕES ---

    salvarLogistica(): void {
      if (!this.validateForm()) return;
      
      this.loading = true;
      const pesoString = this.pesoCaminhao ? String(this.pesoCaminhao) : null;
      const dados = {
        U_placa: this.placa,
        U_motorista: this.nomeMotorista,
        U_pesoCaminhao: pesoString
      } as any;

      this.ordemCarregamentoService.atualizarLogistica(this.selected!.DocEntry, dados).subscribe({
        next: () => {
          this.alertService.confirm('Dados de logística salvos com sucesso!');
          if (this.selected) {
            this.selected.U_placa = this.placa;
            this.selected.U_motorista = this.nomeMotorista;
            this.selected.U_pesoCaminhao = this.pesoCaminhao;
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