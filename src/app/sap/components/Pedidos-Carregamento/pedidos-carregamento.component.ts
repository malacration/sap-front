import { Component, OnInit } from '@angular/core';
import {
  PedidosCarregamentoService,
  PedidoCarregamento,
} from '../../service/pedidos-carregamento.service';

@Component({
  selector: 'pedidos-carregamento',
  templateUrl: './pedidos-carregamento.component.html',
  styleUrls: ['./pedidos-carregamento.component.scss'],
})
export class PedidosCarregamentoComponent implements OnInit {
  /** Lista completa vinda do backend */
  todosPedidos: PedidoCarregamento[] = [];

  /** Lista “filtrada” (neste caso, mesma que todosPedidos) */
  filteredPedidos: PedidoCarregamento[] = [];

  /** Flag de carregamento */
  carregando = false;

  /** Controles de filtro — continuam declarados, mas não mudam o resultado */
  filterDate: string = '';
  filterVendor: string = '';
  filterClient: string = '';
  filterProduct: string = '';

  /** Paginação */
  pageSize = 10;
  currentPage = 1;

  constructor(private pedidosService: PedidosCarregamentoService) {}

  ngOnInit(): void {
    this.loadPedidosParaModal();
  }

  /** Busca TODOS os pedidos no backend e preenche this.todosPedidos e this.filteredPedidos */
  private loadPedidosParaModal(): void {
    this.carregando = true;
    this.pedidosService.get().subscribe({
      next: (data) => {
        this.todosPedidos = data;
        // Ao terminar de buscar, simplesmente exibimos a lista completa:
        this.filteredPedidos = [...this.todosPedidos];
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao buscar pedidos:', err);
        this.carregando = false;
      },
    });
  }

  /**
   * Mesmo que o usuário digite algo nos filtros, NÃO vamos alterar filteredPedidos.
   * Apenas reiniciamos a página para a 1 toda vez que um filtro for modificado.
   */
  applyFilters(): void {
    this.currentPage = 1;
    // Intencionalmente não alteramos filteredPedidos.
    // Mantemos toda a lista em filteredPedidos para que nada seja filtrado.
  }

  /** Chamado pelo componente de paginação quando a página muda */
  onPageChange(novaPagina: number) {
    this.currentPage = novaPagina;
  }

  /** Retorna apenas o “fatiado” de 10 itens para exibir na tabela */
  get pagedPedidos(): PedidoCarregamento[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = this.currentPage * this.pageSize;
    return this.filteredPedidos.slice(start, end);
  }
}
