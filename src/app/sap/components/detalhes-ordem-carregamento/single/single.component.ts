import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';
import { OrdemCarregamento } from '../../../model/ordem-carregamento';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';
import { BusinessPartner } from '../../../model/business-partner/business-partner';
import { BusinessPartnerService } from '../../../service/business-partners.service';
import { InvoiceGenerationService } from '../../../service/invoice-generation.service';
import { PedidosVendaService } from '../../../service/document/pedidos-venda.service';


class ItemSelecaoLoteAgrupado{ 
  id: string; 
  deposito: string; 
  quantidade: number 
  lotes? : BatchStock[]
}

@Component({
  selector: 'app-ordem-carregamento-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class OrdemCarregamentoSingleComponent implements OnInit {

  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService,
    private invoiceGenerationService: InvoiceGenerationService,
    private businesPartnerService : BusinessPartnerService,
    private pedidosVendaService : PedidosVendaService
  ) {}

  cardName = "windson";
  id = "666";

  @Input()
  selected: OrdemCarregamento = null;

  @Output()
  close = new EventEmitter();

  placa: string = '';
  nomeMotorista: string = '';
  transportadora: string = '';
  nomeOrdem: string = '';
  loading = false;
  showModal = false;
  mostrarDebug = false;
  businesPartner : BusinessPartner = null;
  pedidos: any[] = []

  currentPage: number = 0;
  groupedItems: { itemCode: string, description: string, totalQuantity: number, codDeposito: string }[] = [];

  get totalPages(): number {
    return this.groupedItems.length || 0;
  }

  get pages(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i);
  }

ngOnInit(): void {
    if (this.selected?.DocEntry) {
      this.loadPedidos(this.selected.DocEntry);
    }

    // Agrupar itens (como já existe no código)
    const itemMap = new Map<string, { itemCode: string, description: string, totalQuantity: number, codDeposito: string }>();
    this.selected.ORD_CRG_LINHACollection.forEach(item => {
      const existing = itemMap.get(item.U_itemCode);
      if (existing) {
        existing.totalQuantity += item.U_quantidade;
      } else {
        itemMap.set(item.U_itemCode, {
          itemCode: item.U_itemCode,
          description: item.U_description,
          totalQuantity: item.U_quantidade,
          codDeposito: item.U_codigoDeposito
        });
      }
    });
    this.groupedItems = Array.from(itemMap.values());
  }
  
  loadPedidos(docEntry: number) {
    this.pedidosVendaService.search2(docEntry).subscribe({
      next: (response: any) => {
        this.pedidos = response.content; // Armazena os dados retornados
      },
      error: (error) => {
        this.alertService.error('Erro ao carregar pedidos: ' + error.message);
      }
    });
  }

  selectBp($event){
    this.businesPartner = $event
    this.businesPartnerService.get(this.businesPartner.CardCode).subscribe(it =>{
        this.businesPartner = it
    })
  }

  getGroupedItems(): Array<ItemSelecaoLoteAgrupado> {
    const map = this.selected.ORD_CRG_LINHACollection.reduce((map, item) => {
      const itemCode = item.U_itemCode;
      const deposito = item.U_codigoDeposito;
      const quantidade = Number(item.U_quantidade ?? 1);

      if (!itemCode || !deposito || isNaN(quantidade)) {
        console.warn("Item inválido ou sem quantidade:", item);
        return map;
      }

      const chave = `${itemCode}-${deposito}`;
      const atual = map.get(chave) ?? 0;
      map.set(chave, atual + quantidade);
      return map;
    }, new Map<string, number>());

    return Array.from(map.entries()).map(([chave, quantidade]) => {
      const [id, deposito] = chave.split('-');
      return { id, deposito, quantidade };
    }).sort((a,b) => a.id.localeCompare(b.id));
  }

  showModalLote = false;
  currentIndexSelecaoLote = 0
  itensSelecaoLoteAgrupado : Array<ItemSelecaoLoteAgrupado> = new Array()

  get currentSelecaoLote() : ItemSelecaoLoteAgrupado {
    if(this.itensSelecaoLoteAgrupado?.length > 0){
      return this.itensSelecaoLoteAgrupado[this.currentIndexSelecaoLote]
    }
    return null
  }

  abrirModalLote(){
    this.itensSelecaoLoteAgrupado = this.getGroupedItems();
    this.currentIndexSelecaoLote = 0
    this.showModalLote = true
  }

  selecionarItemLote(index: number) {
    this.currentIndexSelecaoLote = index;
  }

  addLotesSelecionados(lotes: BatchStock[]) {
    if (lotes && lotes.length > 0) {
        this.itensSelecaoLoteAgrupado[this.currentIndexSelecaoLote].lotes = lotes;
    }
    
    const proximoIndex = this.itensSelecaoLoteAgrupado.findIndex(
        (item, index) => index > this.currentIndexSelecaoLote && (!item.lotes || item.lotes.length == 0)
    );
    
    if (proximoIndex >= 0) {
        this.currentIndexSelecaoLote = proximoIndex;
    }

    console.log(lotes)
  }

  cancelarSelecaoLotes() {
    this.itensSelecaoLoteAgrupado = [];
    this.showModalLote = false;
  }

  todosLotesSelecionados(): boolean {
    return this.itensSelecaoLoteAgrupado.every(item => 
        item.lotes && item.lotes.length > 0 && 
        item.lotes.reduce((sum, lote) => sum + lote.Quantity, 0) == item.quantidade
    );
  }

  hashNextItemLote() : boolean{
    return this.itensSelecaoLoteAgrupado.length > this.currentIndexSelecaoLote
  }

  isCurrentLote(atual,current) : boolean{
    return atual?.id == current?.id && atual?.lote == current?.lote
  }

  voltar() {
    this.close.emit();
  }

  action(event: ActionReturn) {}

  gerarNotaFiscal() {
    this.loading = true;
    this.abrirModalLote()
      
    // this.invoiceGenerationService.generateInvoiceFromLoadingOrder(this.selected)
    //   .subscribe({
    //     next: (response) => {
    //       this.alertService.confirm('Nota fiscal gerada com sucesso!');
    //     },
    //     error: (error) => {
    //       this.alertService.error('Erro ao gerar nota fiscal: ' + error.message);
    //     },
    //     complete: () => {
    //       this.loading = false;
    //     }
    // });
  }

  fecharModalSelecaoLote() {
    this.showModal = false;
    this.alertService.error('A geração da nota fiscal foi cancelada. Todos os lotes devem ser selecionados.');
  }


  confirmarSelecaoLotes() {
    if (this.todosLotesSelecionados()) {
        // Aqui você pode implementar a lógica para processar os lotes selecionados
        console.log('Lotes selecionados:', this.itensSelecaoLoteAgrupado);
        this.showModalLote = false;
        
        // Chame o serviço para gerar a nota fiscal com os lotes selecionados
        this.gerarNotaFiscalComLotes();
    } else {
        this.alertService.error('Por favor, selecione lotes para todos os itens antes de confirmar.');
    }
  }

gerarNotaFiscalComLotes() {
  if (!this.todosLotesSelecionados()) {
    this.alertService.error('Por favor, selecione lotes para todos os itens antes de confirmar.');
    return;
  }

  this.loading = true;
  
  const notasFiscais = this.prepararPayloadNotaFiscal();
  
  const requests = notasFiscais.map(nota => 
    this.invoiceGenerationService.generateInvoiceFromLoadingOrder(nota).toPromise()
  );

  Promise.all(requests)
    .then(responses => {
      this.alertService.confirm(`Notas fiscais geradas com sucesso! Total: ${responses.length}`);
      this.selected.U_Status = 'Fechado';
      this.showModalLote = false;
    })
    .catch(error => {
      console.error('Erro detalhado:', error);
      const errorMsg = error.error?.message || error.message || 'Erro desconhecido';
      this.alertService.error(`Erro ao gerar notas fiscais: ${errorMsg}`);
    })
    .finally(() => {
      this.loading = false;
    });
}

prepararPayloadNotaFiscal(): any[] {
  const currentDate = new Date().toISOString().split('T')[0];

  // Agrupar linhas por U_numDocPedido
  const pedidosMap = new Map<number, any[]>();
  this.selected.ORD_CRG_LINHACollection.forEach(item => {
    const numPedido = item.U_numDocPedido;
    if (!pedidosMap.has(numPedido)) {
      pedidosMap.set(numPedido, []);
    }
    pedidosMap.get(numPedido).push(item);
  });

  // Criar uma nota fiscal para cada pedido
  const notasFiscais = [];

  pedidosMap.forEach((linhasPedido, numPedido) => {
    const documentLines = [];

    linhasPedido.forEach(item => {
      const itemAgrupado = this.itensSelecaoLoteAgrupado.find(
        ag => ag.id === item.U_itemCode && ag.deposito === item.U_codigoDeposito
      );

      if (itemAgrupado && itemAgrupado.lotes) {
        itemAgrupado.lotes.forEach(lote => {
          documentLines.push({
            ItemCode: item.U_itemCode,
            Quantity: lote.Quantity,
            UnitPrice: item.U_precoUnitario,
            WarehouseCode: item.U_codigoDeposito,
            Usage: item.U_usage,
            TaxCode: item.U_taxCode,
            CostingCode: item.U_costingCode,
            CostingCode2: item.U_costingCode2,
            BaseType: 17,
            BaseEntry: item.U_orderDocEntry,
            BaseLine: item.U_baseLine,
            U_description: item.U_description,
            U_preco_negociado: item.U_precoNegociado,
            U_preco_base: item.U_precoBase,
            LineTotal: item.U_fretePorLinha,
            BatchNumbers: [{
              BatchNumber: lote.DistNumber,
              Quantity: lote.Quantity,
              ItemCode: item.U_itemCode
            }]
          });
        });
      }
    });

    let comentario = linhasPedido[0]?.U_comentario || '';
    if (!comentario) {
      const quotationNumber = numPedido;
      comentario = `Baseado em Cotações de vendas ${quotationNumber}.`;
      const openingRemarks = this.selected.OpeningRemarks || "3 KM APOS CALIFORNIA BR 364 CASA VERDE COM CURRAL PERTO DO LADO DIREITO NO OSNEI";
      if (openingRemarks) {
        comentario = `${openingRemarks} ${comentario}`;
      }
    }

    // Criar o objeto TaxExtension a partir de selected
    const taxExtension = {
      Incoterms: this.selected.Incoterms || null, // Aqui faz sentido verificar se existe
      Vehicle: this.placa || '',
      Carrier: this.businesPartner?.CardCode || ''
    };

    notasFiscais.push({
      CardCode: linhasPedido[0]?.U_cardCode || '',
      DocDueDate: currentDate,
      DocumentLines: documentLines,
      BPL_IDAssignedToInvoice: this.selected.U_filial3?.toString(),
      ClosingRemarks : this.nomeMotorista,
      Comments: comentario,
      U_id_pedido_forca: this.selected.DocEntry?.toString(),
      U_ordemCarregamento: this.selected.DocEntry,
      U_numDocPedido: numPedido.toString(),
      TaxExtension: (taxExtension.Incoterms, taxExtension.Vehicle, taxExtension.Carrier) ? taxExtension : null,
      AttachmentEntry: this.selected.U_numeroAnexo
    });
  });

  return notasFiscais;
}
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  finalizarDocumento(docEntry: number) {
    this.loading = true;
    this.ordemCarregamentoService.finalizar(docEntry).subscribe({
      next: () => {
        this.alertService.confirm("Documento finalizado com sucesso!");
        this.selected.U_Status = "Fechado";
      },
      error: (err) => {
        this.alertService.error("Erro ao finalizar documento: " + err.message);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  confirmarCancelamento(docEntry: number) {
    this.alertService.confirm("Tem certeza que deseja cancelar este documento? Uma vez cancelado, não poderá ser revertido.")
      .then(it => {
        if (it.isConfirmed) {
          this.loading = true;
          this.ordemCarregamentoService.cancel(docEntry).subscribe({
            next: () => {
              this.alertService.confirm("Documento cancelado com sucesso!");
              this.selected.U_Status = "Cancelado";
            },
            error: (err) => {
              this.alertService.error("Erro ao cancelar documento: " + err.message);
            },
            complete: () => {
              this.loading = false;
            }
          });
        }
      });
  }

definition = [
  new Column('Núm. do Pedido', 'DocNum'),
  new Column('Cód. Cliente', 'CardCode'),
  new Column('Nome Cliente', 'CardName'),
  new Column('Cód. Item', 'ItemCode'),
  new Column('Dsc. Item', 'Dscription'),
  new Column('Quantidade', 'Quantity'),
  new Column('Un. Medida', 'UomCode'),
  new Column('Peso', 'Weight'), // Ajuste se necessário (veja observação abaixo)
  new Column('Em Estoque', 'OnHand') // Ajuste se necessário (veja observação abaixo)
];
}