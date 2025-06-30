import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Column } from '../../../../shared/components/table/column.model';
import { AlertService } from '../../../service/alert.service';
import { ActionReturn } from '../../../../shared/components/action/action.model';
import { OrdemCarregamentoService } from '../../../service/ordem-carregamento.service';
import { OrdemCarregamento } from '../../../model/ordem-carregamento';
import { InvoiceGenerationService } from '../../../service/invoice-generation.service';
import { BatchStock } from '../../../../modulos/sap-shared/_models/BatchStock.model';


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

  addLotesSelecionados(lote : BatchStock[]){
    this.itensSelecaoLoteAgrupado[this.currentIndexSelecaoLote].lotes = lote
    if(this.hashNextItemLote()){
      this.currentIndexSelecaoLote++
    }
    
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