import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';
import { OrdemCarregamento } from '../../../model/ordem-carregamento';
import { InvoiceGenerationService } from '../../../service/invoice-generation.service';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';

@Component({
  selector: 'app-ordem-carregamento-single',
  templateUrl: './single.component.html',
  styleUrls: ['./single.component.scss']
})
export class OrdemCarregamentoSingleComponent implements OnInit {
[x: string]: any;
  constructor(
    private alertService: AlertService,
    private ordemCarregamentoService: OrdemCarregamentoService,
    private invoiceGenerationService: InvoiceGenerationService
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
  selectedBatches : Map<string,BatchStock[]> = new Map();
  currentPage: number = 0;
  groupedItems: { itemCode: string, description: string, totalQuantity: number, codDeposito: string }[] = [];

  get totalPages(): number {
    return this.groupedItems.length || 0;
  }

  get pages(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i);
  }

  ngOnInit(): void {
    // Group items by U_itemCode and sum quantities
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

  getGroupedItems() : Map<string,number>{
    console.log(this.selected.ORD_CRG_LINHACollection)
    // Object.groupBy(this.selected.ORD_CRG_LINHACollection, it => `${it.U_itemCode}-${it.U_codigoDeposito}`);

    return this.selected.ORD_CRG_LINHACollection.reduce((map, item) => {
      const itemCode = item.U_itemCode;
      const deposito = item.U_codigoDeposito;
      const quantidade = Number(item.U_quantidade ?? 1); // fallback para 1 caso não exista

      if (!itemCode || !deposito || isNaN(quantidade)) {
        console.warn("Item inválido ou sem quantidade:", item);
        return map;
      }

      const chave = `${itemCode}-${deposito}`;
      const atual = map.get(chave) ?? 0;
      map.set(chave, atual + quantidade);
      console.log()
      return map;
    }, new Map<string, number>());

  }
  
  debug(it : any){
    console.log(JSON.stringify(it))
  }

  voltar() {
    this.close.emit();
  }

  action(event: ActionReturn) {}

  gerarNotaFiscal() {
    this.loading = true;
    this.invoiceGenerationService.generateInvoiceFromLoadingOrder(this.selected)
      .subscribe({
        next: (response) => {
          this.alertService.confirm('Nota fiscal gerada com sucesso!');
        },
        error: (error) => {
          this.alertService.error('Erro ao gerar nota fiscal: ' + error.message);
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  abrirModalPreview() {
    this.alertService.confirm('Deseja gerar a nota fiscal para esta ordem de carregamento?')
      .then(result => {
        if (result.isConfirmed) {
          if (this.isSelecaoLotesValida()) {
            this.gerarNotaFiscal();
          } else {
            this.abrirModalSelecaoLote();
          }
        }
      });
  }

  abrirModalSelecaoLote() {
    this.showModal = true;
    this.currentPage = 0;
    this.selectedBatches = new Map();
  }

  fecharModalSelecaoLote() {
    this.showModal = false;
    this.alertService.error('A geração da nota fiscal foi cancelada. Todos os lotes devem ser selecionados.');
  }

  onLotesSelecionados(lotes: BatchStock[], key: string) {
    this.selectedBatches[key] = lotes;
  }

  isSelecaoLotesValida(): boolean {
    return this.groupedItems.every(item => {
      const lotes = this.selectedBatches[item.itemCode] || [];
      const totalSelecionado = lotes.reduce((acc, lote) => acc + (Number(lote.quantitySelecionadaEditable) || 0), 0);
      return totalSelecionado === item.totalQuantity;
    });
  }

  confirmarSelecaoLotes() {
    if (!this.isSelecaoLotesValida()) {
      this.alertService.error('Por favor, selecione todos os lotes necessários para cada item antes de confirmar.');
      return;
    }
    // Assign batches back to original items
    this.selected.ORD_CRG_LINHACollection.forEach(item => {
      const lotes = this.selectedBatches[item.U_itemCode] || [];
      item.U_batchNumbers = lotes.map(lote => ({
        BatchNumber: lote.DistNumber,
        Quantity: lote.quantitySelecionadaEditable,
        ItemCode: item.U_itemCode
      }));
    });
    this.alertService.confirm('Lotes selecionados com sucesso!');
    this.showModal = false;
    this.gerarNotaFiscal();
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
    new Column('Núm. do Pedido', 'U_docNumPedido'),
    new Column('Cód. Cliente', 'U_cardCode'),
    new Column('Nome Cliente', 'U_cardName'),
    new Column('Cód. Item', 'U_itemCode'),
    new Column('Dsc. Item', 'U_description'),
    new Column('Quantidade', 'U_quantidade'),
    new Column('Peso', 'U_pesoItem'),
    new Column('Un. Medida', 'U_unMedida'),
    new Column('Em Estoque', 'U_qtdEstoque')
  ];
}